import { describe, expect, it } from "vitest"
import { categories, dashboardSections } from "../lib/carava-data"
import { t, translateText } from "../lib/carava-i18n"

describe("Carava localization", () => {
  it("translates every role dashboard navigation label in Amharic and Afaan Oromo", () => {
    for (const sections of Object.values(dashboardSections)) {
      for (const section of sections) {
        expect(translateText("am", section), `Amharic translation for ${section}`).not.toBe(section)
        expect(translateText("om", section), `Afaan Oromo translation for ${section}`).not.toBe(section)
      }
    }
  })

  it("translates key public landing, category, and onboarding copy", () => {
    const copy = [
      "MADE FOR ADAMA, OPEN TO EVERYONE",
      "Good work begins",
      "Find trusted local professionals, meaningful work, and the right help for whatever comes next.",
      "What can we help you with?",
      "A good next step starts here.",
      "Phone number",
      "Choose a starting category",
      "Choose an Adama neighborhood",
      ...categories.flatMap((category) => [category.name, category.description, ...category.subcategories]),
    ]
    for (const text of copy) {
      expect(translateText("am", text), `Amharic translation for ${text}`).not.toBe(text)
      expect(translateText("om", text), `Afaan Oromo translation for ${text}`).not.toBe(text)
    }
  })

  it("translates actionable support workflow controls and informational content", () => {
    for (const text of [
      "Review sample support requests, record a reason, and keep decisions in the demo audit log. No message is delivered to a user.",
      "Mark in review",
      "Resolve case",
      "Escalate case",
      "This is a demo support decision. The reason is saved to the local audit log; no message is sent.",
      "Demo support case resolved with a reason. No message was sent.",
      "Opportunity starts in our own community.",
      "Privacy, with care.",
      "Send demo message",
    ]) {
      expect(translateText("am", text), `Amharic translation for ${text}`).not.toBe(text)
      expect(translateText("om", text), `Afaan Oromo translation for ${text}`).not.toBe(text)
    }
  })

  it("uses the shared workflow catalog while keeping English as the source locale", () => {
    expect(t("am", "accept")).not.toBe(t("en", "accept"))
    expect(t("om", "bookingDetails")).not.toBe(t("en", "bookingDetails"))
    expect(translateText("am", "Review completed work")).toBe("የተጠናቀቀውን ስራ ገምግም")
    expect(translateText("om", "Company profile")).toBe("Profaayila dhaabbataa")
    expect(translateText("am", "Verification status")).not.toBe("Verification status")
    expect(translateText("om", "Request verification review")).not.toBe("Request verification review")
    expect(translateText("am", "Upload demo file (PDF, JPG, or PNG; up to 10 MB)")).not.toContain("Upload demo file")
    expect(translateText("om", "Filename saved only; no file uploaded")).not.toBe("Filename saved only; no file uploaded")
    expect(translateText("en", "Company profile")).toBe("Company profile")
    for (const copy of [
      "My job posts",
      "What needs to be done?",
      "Submit job post for review",
      "Review applications to your approved job posts. Status changes appear in the worker workspace.",
      "Assign a sample worker to one of your published vacancies. The assignment appears in the worker workspace.",
      "Worker assignment saved in the shared demo workspace.",
      "Close details",
      "Demo configuration saved. Nothing has changed in production.",
    ]) {
      expect(translateText("am", copy), `Amharic translation for ${copy}`).not.toBe(copy)
      expect(translateText("om", copy), `Afaan Oromo translation for ${copy}`).not.toBe(copy)
    }
  })

  it("falls back to source copy for content not yet in the translation catalog", () => {
    const sampleContent = "A local sample worker profile"
    expect(translateText("am", sampleContent)).toBe(sampleContent)
    expect(translateText("om", sampleContent)).toBe(sampleContent)
  })
})
