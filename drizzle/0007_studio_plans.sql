-- JSON restore can replace classroom rows. The API validates the classroom on access.
CREATE TABLE studio_plans (
    owner_key TEXT NOT NULL,
    classroom_id TEXT NOT NULL,
    resource_ids TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT studio_plan_resource_array CHECK (json_valid(resource_ids) AND json_type(resource_ids) = 'array'),
    PRIMARY KEY (owner_key, classroom_id)
);
