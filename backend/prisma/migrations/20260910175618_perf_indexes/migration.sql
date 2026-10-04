-- CreateIndex
CREATE INDEX "Resource_campusId_idx" ON "Resource"("campusId");

-- CreateIndex
CREATE INDEX "Resource_status_schoolId_idx" ON "Resource"("status", "schoolId");

-- CreateIndex
CREATE INDEX "Resource_status_subjectId_idx" ON "Resource"("status", "subjectId");

-- CreateIndex
CREATE INDEX "Resource_status_type_idx" ON "Resource"("status", "type");

-- CreateIndex
CREATE INDEX "Resource_year_idx" ON "Resource"("year");

-- CreateIndex
CREATE INDEX "Resource_level_idx" ON "Resource"("level");

-- CreateIndex
CREATE INDEX "Resource_createdAt_idx" ON "Resource"("createdAt");

-- CreateIndex
CREATE INDEX "Resource_campusId_schoolId_subjectId_idx" ON "Resource"("campusId", "schoolId", "subjectId");

-- CreateIndex
CREATE INDEX "School_campusId_idx" ON "School"("campusId");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "School"("name");

-- CreateIndex
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");

-- CreateIndex
CREATE INDEX "Subject_name_idx" ON "Subject"("name");
