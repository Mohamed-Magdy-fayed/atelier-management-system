import type { LanguageMessages } from "@/features/core/i18n/lib";

export default {
  sandbox: {
    demoBadge: "Demo",
    unavailableTitle: "This screen is in the full system",
    unavailableBody:
      "In this demo you can try Branches and Dresses. Everything else is waiting for you in your free account.",
    unavailableCta: "Back to dresses",
    try: {
      metaTitle: "Try Gateling Atelier",
      eyebrow: "Live demo, no sign-up",
      title: "Run your atelier from your phone",
      intro:
        "This is the real system on a demo atelier. Follow the steps, add your branch and your first dress, and see it appear straight away.",
      savedLocally:
        "Demo data is saved only in this browser. Nothing is sent anywhere.",
      stepsHeading: "Your steps",
      stepLabel: "Step",
      tryBelow: "Try it below",
      next: "Next",
      back: "Back",
      done: "Done",
      resetDemo: "Reset demo",
      resetConfirm: "Clear what you added and start over?",
      phoneLabel: "Live demo of the system on a phone",
      startFree: "Start free",
      whatsapp: "Talk to us on WhatsApp",
      pricingNote:
        "Free for 1 branch. 500 EGP per branch per month after that.",
      allDoneTitle: "You just ran an atelier",
      allDoneBody:
        "Want this for your own atelier? Start free and tell us a little about your business.",
      steps: {
        branchesTitle: "Open Branches",
        branchesBody:
          "This is where your shops live. We opened it for you with two demo branches.",
        addressTitle: "Add a branch with its address",
        addressBody:
          "We opened the form. Give the branch a short code (like NAS), a name in English and Arabic, and an address, then press save.",
        addressDone: "Your new branch is in the list.",
        dressesTitle: "Open Dresses",
        dressesBody:
          "Every dress in every branch, with its price, status and how often it was rented.",
        dressTitle: "Add your first dress",
        dressBody:
          "We opened the form. Pick the branch, give the dress a code and a name, set a daily price, then press save.",
        dressDone: "Your dress is now in the catalog.",
      },
    },
    lead: {
      title: "Start your free account",
      intro:
        "A few quick questions so we can set up your atelier properly. It takes about a minute.",
      ownerName: "Your name",
      name: "Atelier name",
      phone: "WhatsApp number",
      phoneHint: "We will message you here to finish your setup.",
      city: "City and area",
      branches: "How many branches do you have?",
      dresses: "About how many dresses?",
      workaround: "How do you track bookings today?",
      workaroundNotebook: "Notebook",
      workaroundExcel: "Excel or Sheets",
      workaroundWhatsapp: "WhatsApp chats",
      workaroundSoftware: "Another program",
      workaroundNothing: "I do not track them",
      incident: "Tell us about the last time a booking or a dress went wrong",
      incidentHint:
        "A double booking, a forgotten pickup, money that went missing. In your own words.",
      social: "Instagram or Facebook page (optional)",
      contactPreference: "How should we contact you?",
      contactWhatsapp: "WhatsApp message",
      contactCall: "Phone call",
      priceReaction:
        "Free for 1 branch, then 500 EGP per branch per month. What do you think?",
      priceFair: "Fair",
      priceExpensive: "Too expensive",
      priceThink: "I need to think",
      consent:
        "I agree that Gateling stores these answers and contacts me about my free account.",
      submit: "Send and start free",
      sending: "Sending...",
      requiredError: "Please fill in the required fields.",
      consentError: "Please tick the box so we can contact you.",
      successTitle: "Thank you, we have your details",
      successBody:
        "We will message you on WhatsApp shortly to open your free account.",
      fallbackTitle: "One more tap",
      fallbackBody:
        "We could not reach our server, so send your details to us on WhatsApp instead.",
      sendWhatsapp: "Send on WhatsApp",
      close: "Close",
    },
  },
} as const satisfies LanguageMessages;
