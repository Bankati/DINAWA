-- CreateIndex
CREATE UNIQUE INDEX "manager_reviews_ownerId_managerId_key" ON "manager_reviews"("ownerId", "managerId");
