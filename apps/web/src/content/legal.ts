import type { Locale } from "@/i18n/routing";

// DRAFT legal texts. They describe how the platform actually works, but must be reviewed by a
// lawyer (and completed with the operator's company details) before public launch.
// "{contact}" is replaced with NEXT_PUBLIC_CONTACT_EMAIL.

export const legalDocs = ["privacy", "terms", "disclaimer", "cookies"] as const;
export type LegalDoc = (typeof legalDocs)[number];

type Section = { heading: string; paragraphs: string[] };
type Doc = { title: string; updated: string; sections: Section[] };

const UPDATED = "2026-09-24";

export const legalContent: Record<Locale, Record<LegalDoc, Doc>> = {
  el: {
    privacy: {
      title: "Πολιτική απορρήτου",
      updated: UPDATED,
      sections: [
        {
          heading: "Υπεύθυνος επεξεργασίας",
          paragraphs: [
            "Υπεύθυνος επεξεργασίας είναι η [Επωνυμία εταιρείας, διεύθυνση, ΑΦΜ]. Για οποιοδήποτε θέμα σχετικά με τα δεδομένα σας, επικοινωνήστε στο {contact}.",
          ],
        },
        {
          heading: "Ποια δεδομένα συλλέγουμε",
          paragraphs: [
            "Στοιχεία λογαριασμού: ονοματεπώνυμο, email, επωνυμία εταιρείας και κρυπτογραφημένος κωδικός πρόσβασης (ή το αναγνωριστικό σας Google, αν συνδεθείτε με Google).",
            "Στοιχεία σταθμών: τύπος, ισχύς, καθεστώς στήριξης, προαιρετική τοποθεσία και τεχνικά χαρακτηριστικά λειτουργίας που εισάγετε εσείς.",
            "Στοιχεία συνδρομής: τα διαχειρίζεται η Stripe. Εμείς δεν αποθηκεύουμε στοιχεία κάρτας.",
            "Τεχνικά δεδομένα: αρχεία καταγραφής διακομιστή (διεύθυνση IP, ώρα, σελίδα) για λόγους ασφάλειας.",
          ],
        },
        {
          heading: "Γιατί τα χρησιμοποιούμε και με ποια νομική βάση",
          paragraphs: [
            "Για την παροχή της υπηρεσίας (εκτέλεση σύμβασης, άρθρο 6 παρ. 1 β ΓΚΠΔ): λογαριασμός, προβλέψεις, προγράμματα παραγωγής, ειδοποιήσεις.",
            "Για την τιμολόγηση και τις φορολογικές μας υποχρεώσεις (νομική υποχρέωση, άρθρο 6 παρ. 1 γ).",
            "Για την ασφάλεια και τη βελτίωση της υπηρεσίας (έννομο συμφέρον, άρθρο 6 παρ. 1 στ).",
            "Για προαιρετικά στατιστικά χρήσης, μόνο με τη συγκατάθεσή σας (άρθρο 6 παρ. 1 α).",
          ],
        },
        {
          heading: "Με ποιους τα μοιραζόμαστε",
          paragraphs: [
            "Με εκτελούντες την επεξεργασία που μας βοηθούν να λειτουργήσουμε την υπηρεσία: Supabase (βάση δεδομένων και σύνδεση, διακομιστές στην ΕΕ), Stripe (πληρωμές), πάροχος αποστολής email, και πάροχος φιλοξενίας. Δεν πουλάμε τα δεδομένα σας.",
          ],
        },
        {
          heading: "Πόσο καιρό τα κρατάμε",
          paragraphs: [
            "Όσο διατηρείτε λογαριασμό. Μετά τη διαγραφή του λογαριασμού, τα δεδομένα διαγράφονται εντός 30 ημερών, εκτός από τα τιμολόγια που φυλάσσουμε όσο απαιτεί η φορολογική νομοθεσία.",
          ],
        },
        {
          heading: "Τα δικαιώματά σας",
          paragraphs: [
            "Έχετε δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού, φορητότητας και εναντίωσης. Μπορείτε να ανακαλέσετε τη συγκατάθεσή σας οποτεδήποτε. Γράψτε μας στο {contact}.",
            "Έχετε επίσης δικαίωμα να υποβάλετε καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr).",
          ],
        },
      ],
    },
    terms: {
      title: "Όροι χρήσης",
      updated: UPDATED,
      sections: [
        {
          heading: "Η υπηρεσία",
          paragraphs: [
            "Παρέχουμε προβλέψεις τιμών της Αγοράς Επόμενης Ημέρας για την ελληνική ζώνη προσφορών και σχετικά εργαλεία (π.χ. προτάσεις προγράμματος παραγωγής, ειδοποιήσεις), μέσω συνδρομής.",
          ],
        },
        {
          heading: "Λογαριασμός",
          paragraphs: [
            "Είστε υπεύθυνοι για την ακρίβεια των στοιχείων που εισάγετε και για την ασφάλεια του κωδικού σας. Ο λογαριασμός προορίζεται για επαγγελματική χρήση.",
          ],
        },
        {
          heading: "Συνδρομή και δοκιμαστική περίοδος",
          paragraphs: [
            "Οι νέοι λογαριασμοί έχουν δωρεάν δοκιμαστική περίοδο 14 ημερών. Μετά, η συνδρομή χρεώνεται μηνιαία και ανανεώνεται αυτόματα μέχρι να την ακυρώσετε. Μπορείτε να ακυρώσετε οποτεδήποτε, με ισχύ στο τέλος της τρέχουσας περιόδου.",
          ],
        },
        {
          heading: "Προβλέψεις και ευθύνη",
          paragraphs: [
            "Οι προβλέψεις είναι στατιστικές εκτιμήσεις και μπορεί να διαφέρουν σημαντικά από τις πραγματικές τιμές. Δεν αποτελούν επενδυτική, χρηματοοικονομική ή εμπορική συμβουλή. Οι αποφάσεις παραγωγής και προσφορών είναι αποκλειστικά δικές σας.",
            "Στο μέτρο που επιτρέπει ο νόμος, δεν ευθυνόμαστε για διαφυγόντα κέρδη ή έμμεσες ζημίες από τη χρήση της υπηρεσίας. Η συνολική μας ευθύνη περιορίζεται στο ποσό που καταβάλατε τους τελευταίους 12 μήνες.",
          ],
        },
        {
          heading: "Εφαρμοστέο δίκαιο",
          paragraphs: ["Οι όροι διέπονται από το ελληνικό δίκαιο. Αρμόδια είναι τα δικαστήρια της [πόλης]."],
        },
      ],
    },
    disclaimer: {
      title: "Αποποίηση ευθύνης",
      updated: UPDATED,
      sections: [
        {
          heading: "Οι προβλέψεις είναι εκτιμήσεις",
          paragraphs: [
            "Οι τιμές που εμφανίζονται είναι προβλέψεις που παράγονται από στατιστικά μοντέλα με βάση δημόσια δεδομένα της αγοράς (ΕΧΕ, ENTSO-E, ΑΔΜΗΕ) και δεν είναι εγγυημένες. Οι πραγματικές τιμές μπορεί να διαφέρουν σημαντικά, ιδίως σε ασυνήθιστες συνθήκες αγοράς.",
            "Το εύρος P10–P90 σημαίνει ότι, κατά την εκτίμηση του μοντέλου, η πραγματική τιμή αναμένεται να βρίσκεται μέσα σε αυτό περίπου 8 στις 10 φορές. Κατά μέσο όρο, 1 στις 10 φορές θα είναι χαμηλότερη και 1 στις 10 υψηλότερη.",
            "Όταν λείπουν δεδομένα, μπορεί να εμφανίζουμε μια απλούστερη πρόβλεψη βάσης και θα το επισημαίνουμε.",
          ],
        },
        {
          heading: "Όχι συμβουλή",
          paragraphs: [
            "Τίποτα σε αυτή την υπηρεσία δεν αποτελεί επενδυτική, χρηματοοικονομική, νομική ή εμπορική συμβουλή. Ελέγχετε πάντα τους όρους της σύμβασης στήριξης του σταθμού σας και τις υποχρεώσεις σας απέναντι στον ΦοΣΕ ή τον εκπρόσωπό σας.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookies",
      updated: UPDATED,
      sections: [
        {
          heading: "Απαραίτητα cookies",
          paragraphs: [
            "sb-…-auth-token: διατηρεί τη σύνδεσή σας (Supabase). Διάρκεια: όσο είστε συνδεδεμένοι.",
            "NEXT_LOCALE: θυμάται τη γλώσσα που επιλέξατε. Διάρκεια: 1 έτος.",
            "cookie_consent: θυμάται την επιλογή σας για τα cookies. Διάρκεια: 6 μήνες.",
          ],
        },
        {
          heading: "Προαιρετικά cookies",
          paragraphs: [
            "Προς το παρόν δεν χρησιμοποιούμε cookies στατιστικών ή διαφήμισης. Αν προσθέσουμε ανώνυμα στατιστικά χρήσης, θα ενεργοποιούνται μόνο αν έχετε επιλέξει «Αποδοχή όλων». Μπορείτε να αλλάξετε την επιλογή σας διαγράφοντας το cookie cookie_consent από τον browser σας.",
          ],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: "Privacy policy",
      updated: UPDATED,
      sections: [
        {
          heading: "Data controller",
          paragraphs: [
            "The data controller is [Company name, address, VAT number]. For any question about your data, contact {contact}.",
          ],
        },
        {
          heading: "What we collect",
          paragraphs: [
            "Account data: full name, email, company name and an encrypted password (or your Google identifier, if you sign in with Google).",
            "Plant data: type, capacity, support scheme, optional location and the operating parameters you enter.",
            "Subscription data: handled by Stripe. We never store card details.",
            "Technical data: server logs (IP address, time, page) for security purposes.",
          ],
        },
        {
          heading: "Why we use it and on what legal basis",
          paragraphs: [
            "To provide the service (performance of a contract, GDPR Art. 6(1)(b)): your account, forecasts, production schedules and alerts.",
            "For invoicing and our tax obligations (legal obligation, Art. 6(1)(c)).",
            "For security and improving the service (legitimate interest, Art. 6(1)(f)).",
            "For optional usage statistics, only with your consent (Art. 6(1)(a)).",
          ],
        },
        {
          heading: "Who we share it with",
          paragraphs: [
            "Processors that help us run the service: Supabase (database and sign-in, EU servers), Stripe (payments), our email delivery provider and our hosting provider. We never sell your data.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "For as long as you have an account. After you delete your account, your data is deleted within 30 days, except invoices, which we keep for as long as tax law requires.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "You have the right to access, rectify, erase, restrict, port and object to the processing of your data, and to withdraw consent at any time. Email us at {contact}.",
            "You can also lodge a complaint with the Hellenic Data Protection Authority (www.dpa.gr).",
          ],
        },
      ],
    },
    terms: {
      title: "Terms of use",
      updated: UPDATED,
      sections: [
        {
          heading: "The service",
          paragraphs: [
            "We provide forecasts of Day-Ahead Market prices for the Greek bidding zone and related tools (such as production schedule suggestions and alerts), on a subscription basis.",
          ],
        },
        {
          heading: "Your account",
          paragraphs: [
            "You're responsible for the accuracy of the data you enter and for keeping your password safe. Accounts are intended for business use.",
          ],
        },
        {
          heading: "Subscription and trial",
          paragraphs: [
            "New accounts get a 14-day free trial. After that, the subscription is billed monthly and renews automatically until you cancel. You can cancel at any time, effective at the end of the current period.",
          ],
        },
        {
          heading: "Forecasts and liability",
          paragraphs: [
            "Forecasts are statistical estimates and can differ significantly from actual prices. They are not investment, financial or trading advice. Production and bidding decisions are entirely yours.",
            "To the extent permitted by law, we're not liable for lost profits or indirect damages arising from use of the service. Our total liability is limited to the amount you paid in the last 12 months.",
          ],
        },
        {
          heading: "Governing law",
          paragraphs: ["These terms are governed by Greek law. The courts of [city] have jurisdiction."],
        },
      ],
    },
    disclaimer: {
      title: "Disclaimer",
      updated: UPDATED,
      sections: [
        {
          heading: "Forecasts are estimates",
          paragraphs: [
            "The prices shown are forecasts produced by statistical models from public market data (HEnEx, ENTSO-E, IPTO) and are not guaranteed. Actual prices can differ significantly, especially in unusual market conditions.",
            "A P10–P90 range means that, by the model's estimate, the actual price should fall inside it about 8 times out of 10. On average it will be lower 1 time in 10 and higher 1 time in 10.",
            "When input data is missing, we may show a simpler baseline forecast, and we'll mark it clearly.",
          ],
        },
        {
          heading: "Not advice",
          paragraphs: [
            "Nothing in this service is investment, financial, legal or trading advice. Always check your plant's support contract and your obligations towards your aggregator (FoSE) or representative.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookies",
      updated: UPDATED,
      sections: [
        {
          heading: "Necessary cookies",
          paragraphs: [
            "sb-…-auth-token: keeps you signed in (Supabase). Duration: while you're signed in.",
            "NEXT_LOCALE: remembers your chosen language. Duration: 1 year.",
            "cookie_consent: remembers your cookie choice. Duration: 6 months.",
          ],
        },
        {
          heading: "Optional cookies",
          paragraphs: [
            'We currently use no analytics or advertising cookies. If we add anonymous usage statistics, they\'ll only run if you chose "Accept all". You can change your choice by deleting the cookie_consent cookie in your browser.',
          ],
        },
      ],
    },
  },
};
