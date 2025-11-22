import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedAdmin1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash default admin password
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Insert default admin user
    await queryRunner.query(`
      INSERT INTO "users" ("id", "username", "password", "createdAt", "updatedAt")
      VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin', '${passwordHash}', NOW(), NOW())
    `);

    // Insert default "Uncategorized" category
    await queryRunner.query(`
      INSERT INTO "categories" ("id", "name", "slug", "description", "createdAt", "updatedAt")
      VALUES
        ('770e8400-e29b-41d4-a716-446655440000', 'Uncategorized', 'uncategorized', 'Photos without category', NOW(), NOW())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "categories" WHERE "slug" = 'uncategorized'`,
    );
    await queryRunner.query(`DELETE FROM "users" WHERE "username" = 'admin'`);
  }
}
