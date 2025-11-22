import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAnalysisCascade1763684486484 implements MigrationInterface {
    name = 'FixAnalysisCascade1763684486484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "analyses" DROP CONSTRAINT "FK_b4c32728bd8c51763ac86fb53ba"`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ALTER COLUMN "source" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "originalFormat" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "analyses" ADD CONSTRAINT "FK_b4c32728bd8c51763ac86fb53ba" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "analyses" DROP CONSTRAINT "FK_b4c32728bd8c51763ac86fb53ba"`);
        await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "originalFormat" SET DEFAULT 'jpeg'`);
        await queryRunner.query(`ALTER TABLE "photo_tags" ALTER COLUMN "source" SET DEFAULT 'auto'`);
        await queryRunner.query(`ALTER TABLE "analyses" ADD CONSTRAINT "FK_b4c32728bd8c51763ac86fb53ba" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
