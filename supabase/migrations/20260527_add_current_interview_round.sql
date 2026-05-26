alter table job_applications
add column current_interview_round integer default 0;

-- Back-fill: ensure no nulls on existing rows
update job_applications
set current_interview_round = 0
where current_interview_round is null;
