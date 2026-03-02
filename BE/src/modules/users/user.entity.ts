import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
} from "typeorm";
import { Student } from "../students/student.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: "text", nullable: true })
  name!: string | null;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @OneToOne(() => Student, (student) => student.user)
  student!: Student | null;
}
