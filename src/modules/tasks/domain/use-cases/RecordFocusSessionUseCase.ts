import type { IFocusSessionRepository } from "../repositories/IFocusSessionRepository";
import type { UUID } from "@/shared/types/database.types";
import type { FocusSession, CreateFocusSessionInput } from "../entities/FocusSession";

export class RecordFocusSessionUseCase {
  constructor(private readonly repo: IFocusSessionRepository) {}

  async execute(userId: UUID, input: CreateFocusSessionInput): Promise<FocusSession> {
    // Sesiones de menos de 60s no se persisten (ruido de "empecé y cancelé").
    if (input.elapsedSec < 60) throw new Error("Session too short to record");
    return this.repo.create(userId, input);
  }
}
