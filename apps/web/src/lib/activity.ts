import type { SupabaseClient } from '@supabase/supabase-js'
import type { AffectedJob, NotificationEventType, NotificationLinkType } from '@job-tracker/shared'

// ─── Event config ────────────────────────────────────────────────────────────

interface EventConfig {
  isLoud: boolean
  readOnCreate: boolean
  linkType: NotificationLinkType
}

const EVENT_CONFIG: Record<NotificationEventType, EventConfig> = {
  auto_archived_inactive:  { isLoud: true,  readOnCreate: false, linkType: 'archived_page'  },
  auto_archived_rejected:  { isLoud: true,  readOnCreate: false, linkType: 'archived_page'  },
  status_changed:          { isLoud: false, readOnCreate: true,  linkType: 'job_detail'     },
  unarchived:              { isLoud: false, readOnCreate: true,  linkType: 'job_detail'     },
  manual_bulk_archive:     { isLoud: false, readOnCreate: true,  linkType: 'archived_page'  },
  job_deleted:             { isLoud: false, readOnCreate: true,  linkType: 'none'           },
  job_created:             { isLoud: false, readOnCreate: true,  linkType: 'job_detail'     },
  interview_round_added:   { isLoud: false, readOnCreate: true,  linkType: 'interview_page' },
  interview_round_updated: { isLoud: false, readOnCreate: true,  linkType: 'interview_page' },
  interview_round_deleted: { isLoud: false, readOnCreate: true,  linkType: 'interview_page' },
}

// ─── Bulk text helpers ────────────────────────────────────────────────────────

export function buildBulkTitle(affectedJobs: AffectedJob[], action: string): string {
  if (affectedJobs.length === 1) {
    return `${affectedJobs[0].company} - ${affectedJobs[0].title} ${action}`
  }
  if (affectedJobs.length === 2) {
    return `${affectedJobs[0].company}, ${affectedJobs[1].company} ${action}`
  }
  return `${affectedJobs[0].company}, ${affectedJobs[1].company} +${affectedJobs.length - 2} more ${action}`
}

export function buildBulkBody(affectedJobs: AffectedJob[], actionPastTense: string): string {
  const list = affectedJobs.map(j => `${j.company} - ${j.title}`).join(', ')
  return `${actionPastTense.charAt(0).toUpperCase() + actionPastTense.slice(1)}: ${list}.`
}

// ─── Single-job event logger ──────────────────────────────────────────────────

interface LogEventParams {
  supabase: SupabaseClient
  userId: string
  jobApplicationId: string | null
  eventType: NotificationEventType
  metadata: Record<string, unknown>
  notificationTitle: string
  notificationBody: string
  linkTypeOverride?: NotificationLinkType
}

export async function logEvent(params: LogEventParams): Promise<void> {
  const config = EVENT_CONFIG[params.eventType]

  const { data: logRow } = await params.supabase
    .from('activity_log')
    .insert({
      user_id: params.userId,
      job_application_id: params.jobApplicationId,
      event_type: params.eventType,
      metadata: params.metadata,
    })
    .select('id')
    .single()

  await params.supabase.from('notifications').insert({
    user_id: params.userId,
    activity_log_id: logRow?.id ?? null,
    job_application_id: params.jobApplicationId,
    event_type: params.eventType,
    title: params.notificationTitle,
    body: params.notificationBody,
    is_loud: config.isLoud,
    is_read: config.readOnCreate,
    read_at: config.readOnCreate ? new Date().toISOString() : null,
    link_type: params.linkTypeOverride ?? config.linkType,
    affected_jobs: null,
  })
}

// ─── Bulk event logger ────────────────────────────────────────────────────────

interface LogBulkEventParams {
  supabase: SupabaseClient
  userId: string
  eventType: NotificationEventType
  affectedJobs: AffectedJob[]
  getMetadata: (job: AffectedJob) => Record<string, unknown>
  notificationTitle: string
  notificationBody: string
}

export async function logBulkEvent(params: LogBulkEventParams): Promise<void> {
  const config = EVENT_CONFIG[params.eventType]

  // One activity_log row per job (audit trail)
  await params.supabase.from('activity_log').insert(
    params.affectedJobs.map(job => ({
      user_id: params.userId,
      job_application_id: job.id,
      event_type: params.eventType,
      metadata: params.getMetadata(job),
    }))
  )

  // One notifications row for the entire batch
  await params.supabase.from('notifications').insert({
    user_id: params.userId,
    activity_log_id: null,
    job_application_id: null,
    event_type: params.eventType,
    title: params.notificationTitle,
    body: params.notificationBody,
    is_loud: config.isLoud,
    is_read: config.readOnCreate,
    read_at: config.readOnCreate ? new Date().toISOString() : null,
    link_type: config.linkType,
    affected_jobs: params.affectedJobs,
  })
}
