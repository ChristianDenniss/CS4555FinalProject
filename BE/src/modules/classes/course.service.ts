import { AppDataSource } from "../../db/data-source";
import { Course } from "./course.entity";

const repo = () => AppDataSource.getRepository(Course);

export async function findAll(): Promise<Course[]> {
  return repo().find({ order: { createdAt: "DESC" } });
}

export async function findById(id: string): Promise<Course | null> {
  return repo().findOne({ where: { id } });
}

export async function create(data: {
  classCode: string;
  startTime: string;
  endTime: string;
  name?: string | null;
  term?: string | null;
  building?: string | null;
  room?: string | null;
  sectionCode?: string | null;
  enrolled?: number | null;
  capacity?: number | null;
}): Promise<Course> {
  const cls = repo().create({
    classCode: data.classCode,
    startTime: data.startTime,
    endTime: data.endTime,
    name: data.name ?? null,
    term: data.term ?? null,
    building: data.building ?? null,
    room: data.room ?? null,
    sectionCode: data.sectionCode ?? null,
    enrolled: data.enrolled ?? null,
    capacity: data.capacity ?? null,
  });
  return repo().save(cls);
}

export async function update(
  id: string,
  data: Partial<{ classCode: string; startTime: string; endTime: string; name: string | null; term: string | null; building: string | null; room: string | null; sectionCode: string | null; enrolled: number | null; capacity: number | null }>
): Promise<Course | null> {
  const cls = await repo().findOne({ where: { id } });
  if (!cls) return null;
  Object.assign(cls, data);
  return repo().save(cls);
}
