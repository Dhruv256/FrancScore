import { expect, test } from "@playwright/test";

test("landing page smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /crack tef & tcf canada with ai/i })).toBeVisible();
});

test("login page smoke", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("onboarding page smoke", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "francscore-test-auth",
      value: "onboarding",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: /about you/i })).toBeVisible();
});

test("dashboard route redirects guests to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("listening practice redirects guests to login", async ({ page }) => {
  await page.goto("/practice/listening");
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("writing coach redirects guests to login", async ({ page }) => {
  await page.goto("/practice/writing");
  await expect(page).toHaveURL(/\/auth\/login$/);
});
