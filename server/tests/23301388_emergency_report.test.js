// server/tests/23301388_emergency_report.test.js
// Feature 3: Emergency Report Submission
// Student ID: 23301388

import request from "supertest";
import app from "../app.js";
import { connectTestDB, disconnectTestDB } from "../src/config/testDb.js";

// ─── real credentials ────────────────────────────────────────────────────────
const USER_EMAIL = "saminsafwan@gmail.com";
const USER_PASSWORD = "1234";
// ─────────────────────────────────────────────────────────────────────────────

describe("Feature 3: Emergency Report Submission (ID: 23301388)", () => {

  let userToken = "";

  beforeAll(async () => {
    await connectTestDB();

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });

    userToken = res.body.token;
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE A — POSITIVE FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Case A: Positive Flow", () => {

    it("TEST 1 — should submit a new emergency report successfully", async () => {

      const res = await request(app)
        .post("/api/emergency/report")
        .set("Authorization", `Bearer ${userToken}`)
        .field("emergencyType", "fire")
        .field(
          "description",
          "A fire broke out in a building near Gulshan 2 circle."
        )
        .field("area", "Gulshan, Dhaka");

      expect([200, 201]).toContain(res.statusCode);


      expect(res.body).toHaveProperty("report");
      expect(res.body.report.emergencyType).toBe("fire");
    });

    it("TEST 2 — should retrieve the user's own reports list", async () => {

      const res = await request(app)
        .get("/api/emergency/my-reports")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("TEST 3 — should submit reports with multiple valid emergency types", async () => {

      const types = ["robbery", "accident", "harassment", "medical"];

      for (const type of types) {

        const res = await request(app)
          .post("/api/emergency/report")
          .set("Authorization", `Bearer ${userToken}`)
          .field("emergencyType", type)
          .field("description", `Testing ${type}`)
          .field("area", "Dhaka");

        expect([200, 201]).toContain(res.statusCode);

        if (res.body.report) {
          expect(res.body.report.emergencyType).toBe(type);
        }
      }
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE B — NEGATIVE FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Case B: Negative Flow", () => {

    it("TEST 4 — should fail when emergencyType is missing", async () => {

      const res = await request(app)
        .post("/api/emergency/report")
        .set("Authorization", `Bearer ${userToken}`)
        .field("description", "Missing emergency type")
        .field("area", "Dhaka");

      expect([400, 500]).toContain(res.statusCode);
    });

    it("TEST 5 — should fail when description is missing", async () => {

      const res = await request(app)
        .post("/api/emergency/report")
        .set("Authorization", `Bearer ${userToken}`)
        .field("emergencyType", "fire")
        .field("area", "Dhaka");

      expect([400, 500]).toContain(res.statusCode);
    });

    it("TEST 6 — should fail for invalid emergency type", async () => {

      const res = await request(app)
        .post("/api/emergency/report")
        .set("Authorization", `Bearer ${userToken}`)
        .field("emergencyType", "earthquake")
        .field("description", "Invalid type")
        .field("area", "Dhaka");

      expect([400, 500]).toContain(res.statusCode);
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE C — SECURITY & BOUNDARY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Case C: Security & Boundary", () => {

    it("TEST 7 — should return unauthorized without token", async () => {

      const res = await request(app)
        .post("/api/emergency/report")
        .field("emergencyType", "fire")
        .field("description", "No token")
        .field("area", "Dhaka");

      expect([401, 403]).toContain(res.statusCode);
    });

    it("TEST 8 — should reject invalid token", async () => {

      const res = await request(app)
        .post("/api/emergency/report")
        .set("Authorization", "Bearer fake.invalid.token")
        .field("emergencyType", "fire")
        .field("description", "Invalid token")
        .field("area", "Dhaka");

      expect([401, 403]).toContain(res.statusCode);
    });

    it("TEST 9 — should retrieve quota information", async () => {

      const res = await request(app)
        .get("/api/emergency/quota")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);

      expect(res.body).toHaveProperty("used");
      expect(res.body).toHaveProperty("limit");
      expect(res.body).toHaveProperty("remaining");
    });

  });

});