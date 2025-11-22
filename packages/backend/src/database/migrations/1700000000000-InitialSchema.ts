import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "username" VARCHAR(50) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_username" ON "users"("username")`,
    );

    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) UNIQUE NOT NULL,
        "description" TEXT,
        "photoCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_category_slug" ON "categories"("slug")`,
    );

    // Create photos table
    await queryRunner.query(`
      CREATE TABLE "photos" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "categoryId" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
        "filename" VARCHAR(255) NOT NULL,
        "originalFormat" VARCHAR(10) NOT NULL,
        "fileHash" VARCHAR(64) UNIQUE NOT NULL,
        "fileSizeBytes" INTEGER NOT NULL,
        "width" INTEGER NOT NULL,
        "height" INTEGER NOT NULL,
        "originalUrl" VARCHAR(500) NOT NULL,
        "thumbnailUrl" VARCHAR(500) NOT NULL,
        "mediumUrl" VARCHAR(500) NOT NULL,
        "visibility" VARCHAR(10) DEFAULT 'public',
        "uploadedAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_photo_file_hash" ON "photos"("fileHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photo_user_id" ON "photos"("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photo_category_id" ON "photos"("categoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photo_visibility" ON "photos"("visibility")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photo_uploaded_at" ON "photos"("uploadedAt")`,
    );

    // Create tags table
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(50) NOT NULL,
        "slug" VARCHAR(50) UNIQUE NOT NULL,
        "photoCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_tag_slug" ON "tags"("slug")`,
    );

    // Create photo_tags join table
    await queryRunner.query(`
      CREATE TABLE "photo_tags" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "photoId" uuid NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
        "tagId" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
        "confidence" DECIMAL(3,2),
        "source" VARCHAR(10) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("photoId", "tagId")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_photo_tag_composite" ON "photo_tags"("photoId", "tagId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photo_tag_photo_id" ON "photo_tags"("photoId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photo_tag_tag_id" ON "photo_tags"("tagId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photo_tag_source" ON "photo_tags"("source")`,
    );

    // Create analyses table
    await queryRunner.query(`
      CREATE TABLE "analyses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "photoId" uuid UNIQUE NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
        "modelVersion" VARCHAR(50) NOT NULL,
        "rawResults" JSONB NOT NULL,
        "dominantColor" VARCHAR(7) NOT NULL,
        "colorPalette" JSONB NOT NULL,
        "analyzedAt" TIMESTAMP NOT NULL,
        "processingTimeMs" INTEGER NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_analysis_photo_id" ON "analyses"("photoId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "analyses"`);
    await queryRunner.query(`DROP TABLE "photo_tags"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TABLE "photos"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
