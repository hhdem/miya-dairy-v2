import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypeToPhotoTag1763683891046 implements MigrationInterface {
    name = 'AddTypeToPhotoTag1763683891046'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "analyses" DROP CONSTRAINT "analyses_photoId_fkey"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP CONSTRAINT "photo_tags_photoId_fkey"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP CONSTRAINT "photo_tags_tagId_fkey"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "photos_userId_fkey"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "photos_categoryId_fkey"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP CONSTRAINT "photo_tags_photoId_tagId_key"`);
        await queryRunner.query(`CREATE TYPE "public"."photo_tags_type_enum" AS ENUM('object', 'emotion', 'scene')`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD "type" "public"."photo_tags_type_enum" NOT NULL DEFAULT 'scene'`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "categories_slug_key"`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "photoCount" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "createdAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "analyses" ALTER COLUMN "createdAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "tags_slug_key"`);
        await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "photoCount" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "createdAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."idx_photo_tag_source"`);
        // Update existing null values before dropping column
        await queryRunner.query(`UPDATE "photo_tags" SET "source" = 'auto' WHERE "source" IS NULL`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP COLUMN "source"`);
        await queryRunner.query(`CREATE TYPE "public"."photo_tags_source_enum" AS ENUM('auto', 'manual')`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD "source" "public"."photo_tags_source_enum" NOT NULL DEFAULT 'auto'`);
        // Update all existing rows to have 'auto' as default
        await queryRunner.query(`UPDATE "photo_tags" SET "source" = 'auto' WHERE "source" IS NULL`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ALTER COLUMN "createdAt" SET NOT NULL`);
        // Update existing null values before dropping column
        await queryRunner.query(`UPDATE "photos" SET "originalFormat" = 'jpeg' WHERE "originalFormat" IS NULL`);
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "originalFormat"`);
        await queryRunner.query(`CREATE TYPE "public"."photos_originalformat_enum" AS ENUM('jpeg', 'png', 'webp', 'heic')`);
        await queryRunner.query(`ALTER TABLE "photos" ADD "originalFormat" "public"."photos_originalformat_enum" NOT NULL DEFAULT 'jpeg'`);
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "photos_fileHash_key"`);
        await queryRunner.query(`DROP INDEX "public"."idx_photo_visibility"`);
        // Update existing null values before dropping column
        await queryRunner.query(`UPDATE "photos" SET "visibility" = 'public' WHERE "visibility" IS NULL`);
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "visibility"`);
        await queryRunner.query(`CREATE TYPE "public"."photos_visibility_enum" AS ENUM('public', 'private')`);
        await queryRunner.query(`ALTER TABLE "photos" ADD "visibility" "public"."photos_visibility_enum" NOT NULL DEFAULT 'public'`);
        await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "createdAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "createdAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_photo_tag_source" ON "photo_tags" ("source") `);
        await queryRunner.query(`CREATE INDEX "idx_photo_visibility" ON "photos" ("visibility") `);
        await queryRunner.query(`ALTER TABLE "analyses" ADD CONSTRAINT "FK_b4c32728bd8c51763ac86fb53ba" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD CONSTRAINT "FK_9b421f180faea913059194e732d" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD CONSTRAINT "FK_03292e7c4df70d6ffabf8d5dab7" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "FK_74da4f305b050f7d27c73b04263" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "FK_e9e5dc71992adc0e149fe895e06" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "FK_e9e5dc71992adc0e149fe895e06"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "FK_74da4f305b050f7d27c73b04263"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP CONSTRAINT "FK_03292e7c4df70d6ffabf8d5dab7"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP CONSTRAINT "FK_9b421f180faea913059194e732d"`);
        await queryRunner.query(`ALTER TABLE "analyses" DROP CONSTRAINT "FK_b4c32728bd8c51763ac86fb53ba"`);
        await queryRunner.query(`DROP INDEX "public"."idx_photo_visibility"`);
        await queryRunner.query(`DROP INDEX "public"."idx_photo_tag_source"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "visibility"`);
        await queryRunner.query(`DROP TYPE "public"."photos_visibility_enum"`);
        await queryRunner.query(`ALTER TABLE "photos" ADD "visibility" character varying(10) DEFAULT 'public'`);
        await queryRunner.query(`CREATE INDEX "idx_photo_visibility" ON "photos" ("visibility") `);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "photos_fileHash_key" UNIQUE ("fileHash")`);
        await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "originalFormat"`);
        await queryRunner.query(`DROP TYPE "public"."photos_originalformat_enum"`);
        await queryRunner.query(`ALTER TABLE "photos" ADD "originalFormat" character varying(10) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."photo_tags_source_enum"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD "source" character varying(10) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_photo_tag_source" ON "photo_tags" ("source") `);
        await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tags" ALTER COLUMN "photoCount" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tags" ADD CONSTRAINT "tags_slug_key" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "analyses" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "photoCount" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "photo_tags" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."photo_tags_type_enum"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_photoId_tagId_key" UNIQUE ("photoId", "tagId")`);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "photos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analyses" ADD CONSTRAINT "analyses_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
