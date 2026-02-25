ALTER TABLE "User"
  ADD COLUMN "googleSubject" TEXT,
  ADD COLUMN "microsoftSubject" TEXT;

CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
CREATE UNIQUE INDEX "User_microsoftSubject_key" ON "User"("microsoftSubject");
