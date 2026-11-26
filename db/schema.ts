import { sqliteTable, text, integer, real, uniqueIndex, index, primaryKey, check } from "drizzle-orm/sqlite-core";
import { desc, sql } from "drizzle-orm";
export const documents = sqliteTable("documents", {
    id: text("id").primaryKey(), grade: integer("grade").notNull(), title: text("title").notNull(),
    edition: text("edition").notNull(), parentId: text("parent_id"), isSample: integer("is_sample").notNull().default(1),
});
export const lessons = sqliteTable("lessons", {
    id: text("id").primaryKey(), documentId: text("document_id").notNull().references(() => documents.id),
    chapter: text("chapter").notNull(), title: text("title").notNull(),
});
export const questions = sqliteTable("questions", {
    id: text("id").primaryKey(), lessonId: text("lesson_id").notNull().references(() => lessons.id),
    originalNumber: integer("original_number").notNull(), revision: integer("revision").notNull().default(1),
    kind: text("kind").notNull(), prompt: text("prompt").notNull(), choices: text("choices").notNull(),
    correct: text("correct").notNull(), solution: text("solution").notNull(),
    bankFingerprint: text("bank_fingerprint"), bankStatus: text("bank_status").notNull().default("auto"), bankOrigin: text("bank_origin"), bankTex: text("bank_tex"), bankMeta: text("bank_meta"), bankNote: text("bank_note").notNull().default(""), bankSearch: text("bank_search").notNull().default(""),
    familyId: text("family_id"), sourceJson: text("source_json"), archivedAt: integer("archived_at"), updatedAt: integer("updated_at").notNull().default(0),
}, (t) => [uniqueIndex("question_source_version").on(t.lessonId, t.originalNumber, t.revision), index("questions_family_revision").on(t.familyId,t.revision), index("questions_lesson_number").on(t.lessonId,t.originalNumber)]);
export const classrooms = sqliteTable("classrooms", {
    id: text("id").primaryKey(), label: text("label").notNull(), grade: integer("grade").notNull(),
    schoolYear: text("school_year").notNull(), isSample: integer("is_sample").notNull().default(1),
});
export const studioPlans = sqliteTable("studio_plans", {
    ownerKey: text("owner_key").notNull(),
    classroomId: text("classroom_id").notNull(),
    resourceIds: text("resource_ids").notNull().default("[]"),
}, (t) => [
    primaryKey({ columns: [t.ownerKey, t.classroomId] }),
    check("studio_plan_resource_array", sql`json_valid(${t.resourceIds}) AND json_type(${t.resourceIds}) = 'array'`),
]);
export const students = sqliteTable("students", {
    id: text("id").primaryKey(), classroomId: text("classroom_id").notNull().references(() => classrooms.id),
    ordinal: integer("ordinal").notNull(), name: text("name").notNull(), archivedAt: integer("archived_at"),
}, (t) => [uniqueIndex("class_ordinal").on(t.classroomId, t.ordinal)]);
export const teacherAccounts = sqliteTable("teacher_accounts", {
    id: text("id").primaryKey().notNull(), username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(), passwordSalt: text("password_salt").notNull(),
    passwordHash: text("password_hash").notNull(), authEpoch: text("auth_epoch").notNull(),
    enabled: integer("enabled").notNull().default(1),
    mustChangePassword: integer("must_change_password").notNull().default(1),
    permissions: text("permissions").notNull().default("{}"),
    allowedClassIds: text("allowed_class_ids").notNull().default("[]"), selectedClassIds: text("selected_class_ids"),
    revision: integer("revision").notNull().default(1),
});
export const savedExams = sqliteTable("saved_exams", {
    id: text("id").primaryKey().notNull(), title: text("title").notNull(),
    mode: text("mode").notNull(), minutes: integer("minutes").notNull(),
    scoringMode: text("scoring_mode").notNull(), ownerTeacherId: text("owner_teacher_id").references(() => teacherAccounts.id),
    createdAt: integer("created_at").notNull(), archivedAt: integer("archived_at"),
    visibility: text("visibility", {enum: ["private", "team"]}).notNull().default("team"),
    revision: integer("revision").notNull().default(1),
}, (t) => [index("saved_exams_owner_visibility").on(t.ownerTeacherId,t.visibility,t.archivedAt)]);
export const savedExamQuestions = sqliteTable("saved_exam_questions", {
    examId: text("exam_id").notNull().references(() => savedExams.id),
    position: integer("position").notNull(), sourceId: text("source_id").notNull(), snapshot: text("snapshot").notNull(),
}, (t) => [primaryKey({ columns: [t.examId, t.position] })]);
export const accountAudit = sqliteTable("account_audit", {
    id: text("id").primaryKey().notNull(), accountId: text("account_id").notNull(),
    accountUsername: text("account_username").notNull(), actor: text("actor").notNull(),
    createdAt: integer("created_at").notNull(), actions: text("actions").notNull(),
}, (t) => [index("account_audit_created").on(desc(t.createdAt),t.id)]);
export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(), code: text("code").notNull().unique(), title: text("title").notNull(),
    classroomId: text("classroom_id").notNull().references(() => classrooms.id),
    mode: text("mode").notNull(), scoringMode: text("scoring_mode").notNull().default("practice"), minutes: integer("minutes").notNull(), state: text("state").notNull(),
    rosterSnapshot: text("roster_snapshot"), ownerTeacherId: text("owner_teacher_id").references(() => teacherAccounts.id), createdAt: integer("created_at").notNull(), closesAt: integer("closes_at").notNull(),
    requiresEntryCode: integer("requires_entry_code").notNull().default(0),
}, (t) => [index("sessions_teacher_class").on(t.ownerTeacherId,t.classroomId,t.createdAt)]);
export const studentEntryCodes = sqliteTable("student_entry_codes", {
    sessionId: text("session_id").notNull().references(() => sessions.id, {onDelete: "cascade"}),
    ordinal: integer("ordinal").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
}, t => [primaryKey({columns: [t.sessionId, t.ordinal]})]);
export const studentEntryFailures = sqliteTable("student_entry_failures", {
    sessionId: text("session_id").notNull().references(() => sessions.id, {onDelete: "cascade"}),
    ordinal: integer("ordinal").notNull(),
    failureCount: integer("failure_count").notNull(),
    windowEndsAt: integer("window_ends_at").notNull(),
}, t => [primaryKey({columns: [t.sessionId, t.ordinal]})]);
export const sessionQuestions = sqliteTable("session_questions", {
    id: text("id").primaryKey(), sessionId: text("session_id").notNull().references(() => sessions.id),
    position: integer("position").notNull(), sourceId: text("source_id").notNull(), snapshot: text("snapshot").notNull(),
}, (t) => [uniqueIndex("session_question_position").on(t.sessionId, t.position)]);
export const attempts = sqliteTable("attempts", {
    id: text("id").primaryKey(), token: text("token").notNull().unique(),
    sessionId: text("session_id").notNull().references(() => sessions.id),
    studentId: text("student_id").notNull().references(() => students.id),
    answers: text("answers").notNull().default("{}"), submittedAt: integer("submitted_at"),
    earned: real("earned"), score: real("score"), updatedAt: integer("updated_at").notNull(),
    saveRevision: integer("save_revision").notNull().default(0), lastSeenAt: integer("last_seen_at").notNull().default(0), allowRejoin: integer("allow_rejoin").notNull().default(0),
}, (t) => [uniqueIndex("one_attempt_per_student").on(t.sessionId, t.studentId)]);

export const workspaceSettings = sqliteTable("workspace_settings", {key:text("key").primaryKey(),value:text("value").notNull()});
export const mutationLog = sqliteTable("mutation_log", {id:text("id").primaryKey(),revision:integer("revision").notNull().unique(),createdAt:integer("created_at").notNull(),summary:text("summary").notNull()});
