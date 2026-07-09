import type { IWorkoutExerciseRepository } from "../repositories/IWorkoutExerciseRepository";
import type { UUID } from "@/shared/types/database.types";
import type { WorkoutExercise, CreateWorkoutExerciseInput } from "../entities/WorkoutExercise";

/**
 * Si el usuario no seleccionó una sugerencia existente del catálogo
 * (catalogExerciseId ausente), se hace upsert por nombre antes de crear el
 * ejercicio — así cada ejercicio nuevo alimenta el autocompletado futuro,
 * sin que el catálogo sea nunca la fuente de verdad del ejercicio en sí
 * (el nombre/tipo quedan denormalizados en WorkoutExercise).
 */
export class CreateWorkoutExerciseUseCase {
  constructor(private readonly repo: IWorkoutExerciseRepository) {}

  async execute(userId: UUID, input: CreateWorkoutExerciseInput): Promise<WorkoutExercise> {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error("Exercise name cannot be empty");

    let catalogExerciseId = input.catalogExerciseId ?? null;
    if (!catalogExerciseId) {
      const catalogEntry = await this.repo.upsertCatalogEntry(userId, trimmed, input.type);
      catalogExerciseId = catalogEntry.id;
    }

    return this.repo.create(userId, { ...input, name: trimmed, catalogExerciseId });
  }
}
