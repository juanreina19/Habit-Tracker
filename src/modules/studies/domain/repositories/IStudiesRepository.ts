import type { UUID } from "@/shared/types/database.types";
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from "../entities/Subject";
import type { Topic, CreateTopicInput, UpdateTopicInput } from "../entities/Topic";
import type { StudySession, LogSessionInput } from "../entities/StudySession";

export interface IStudiesRepository {
  findSubjectsByUser(userId: UUID): Promise<Subject[]>;
  createSubject(userId: UUID, input: CreateSubjectInput): Promise<Subject>;
  updateSubject(id: UUID, input: UpdateSubjectInput): Promise<Subject>;
  deleteSubject(id: UUID): Promise<void>;

  findTopicsBySubject(subjectId: UUID): Promise<Topic[]>;
  createTopic(userId: UUID, input: CreateTopicInput): Promise<Topic>;
  updateTopic(id: UUID, input: UpdateTopicInput): Promise<Topic>;
  deleteTopic(id: UUID): Promise<void>;

  findSessionsByUser(userId: UUID): Promise<StudySession[]>;
  logSession(userId: UUID, input: LogSessionInput): Promise<StudySession>;
}
