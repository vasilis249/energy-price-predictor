import type { Locale } from "@/i18n/routing";

// DRAFT legal texts. They describe how the marketplace actually works, but must be reviewed by a
// lawyer (and completed with the operator's company details) before public launch.
// "{contact}" is replaced with NEXT_PUBLIC_CONTACT_EMAIL.

export const legalDocs = ["privacy", "terms", "disclaimer", "cookies"] as const;
export type LegalDoc = (typeof legalDocs)[number];

type Section = { heading: string; paragraphs: string[] };
type Doc = { title: string; updated: string; sections: Section[] };

const UPDATED = "2026-09-25";

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
            "Στοιχεία λογαριασμού: ονοματεπώνυμο, email, κρυπτογραφημένος κωδικός (ή αναγνωριστικό Google).",
            "Στοιχεία επιχείρησης: επωνυμία, ΑΦΜ, τηλέφωνο, ρόλος (αγοραστής ή πωλητής) και κατάσταση επαλήθευσης.",
            "Εγκαταστάσεις: ονομασία, τύπος, δήμος, διεύθυνση και συντεταγμένες. Η ακριβής θέση δεν εμφανίζεται σε άλλους χρήστες πριν από συμφωνία.",
            "Αγγελίες, προσφορές, συμφωνίες, παραδόσεις και μηνύματα μεταξύ των μερών.",
            "Στοιχεία πληρωμών: τα διαχειρίζεται η Stripe (έλεγχος ταυτότητας πωλητών, IBAN, κάρτες/εντολές SEPA). Εμείς δεν αποθηκεύουμε στοιχεία κάρτας ή τραπεζικού λογαριασμού.",
            "Τεχνικά δεδομένα: αρχεία καταγραφής διακομιστή (διεύθυνση IP, ώρα, σελίδα) για λόγους ασφάλειας.",
          ],
        },
        {
          heading: "Γιατί τα χρησιμοποιούμε και με ποια νομική βάση",
          paragraphs: [
            "Για τη λειτουργία της αγοράς (εκτέλεση σύμβασης, άρθρο 6 παρ. 1 β ΓΚΠΔ): αγγελίες, προσφορές, συμφωνίες, παραδόσεις, πληρωμές και ειδοποιήσεις.",
            "Για την επαλήθευση επιχειρήσεων και την πρόληψη απάτης (έννομο συμφέρον, άρθρο 6 παρ. 1 στ).",
            "Για φορολογικές υποχρεώσεις, όπως τιμολόγηση της προμήθειας και δηλώσεις πλατφόρμας προς την ΑΑΔΕ κατά την Οδηγία DAC7 / ν. 5047/2023 (νομική υποχρέωση, άρθρο 6 παρ. 1 γ).",
            "Για προαιρετικά στατιστικά χρήσης, μόνο με τη συγκατάθεσή σας (άρθρο 6 παρ. 1 α).",
          ],
        },
        {
          heading: "Με ποιους τα μοιραζόμαστε",
          paragraphs: [
            "Με τον αντισυμβαλλόμενο: όταν κάνετε προσφορά ή κλείνετε συμφωνία, η άλλη πλευρά βλέπει την επωνυμία σας και τα στοιχεία επικοινωνίας που χρειάζονται για την εκτέλεσή της.",
            "Με εκτελούντες την επεξεργασία: Supabase (βάση δεδομένων και σύνδεση, διακομιστές στην ΕΕ), Stripe (πληρωμές), πάροχος αποστολής email, πάροχος χαρτών και πάροχος φιλοξενίας.",
            "Με την ΑΑΔΕ, όπου το απαιτεί ο νόμος (π.χ. DAC7). Δεν πουλάμε τα δεδομένα σας.",
          ],
        },
        {
          heading: "Πόσο καιρό τα κρατάμε",
          paragraphs: [
            "Όσο διατηρείτε λογαριασμό. Τα στοιχεία συναλλαγών και τιμολόγησης φυλάσσονται όσο απαιτεί η φορολογική νομοθεσία, ακόμη και μετά τη διαγραφή του λογαριασμού.",
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
            "Η πλατφόρμα είναι ηλεκτρονική αγορά που φέρνει σε επαφή παραγωγούς πρώτων υλών (π.χ. κοπριάς, υγρών αποβλήτων, υπολειμμάτων βιομηχανίας τροφίμων) με μονάδες βιοαερίου, και διευκολύνει τη σύναψη συμφωνιών προμήθειας, την καταγραφή παραδόσεων και τις πληρωμές.",
            "Η πλατφόρμα δεν αγοράζει ούτε πωλεί πρώτες ύλες και δεν είναι μέρος των συμφωνιών μεταξύ αγοραστών και πωλητών.",
          ],
        },
        {
          heading: "Λογαριασμοί και επαλήθευση",
          paragraphs: [
            "Η πλατφόρμα απευθύνεται σε επιχειρήσεις και επαγγελματίες (και αγρότες). Δηλώνετε αληθή στοιχεία επιχείρησης, συμπεριλαμβανομένου του ΑΦΜ. Μπορούμε να ελέγξουμε τα στοιχεία, να ζητήσουμε δικαιολογητικά και να αναστείλουμε λογαριασμούς με ανακριβή στοιχεία.",
            "Κάθε επιχείρηση έχει έναν ρόλο (αγοραστής ή πωλητής), που επιλέγεται στην εγγραφή.",
          ],
        },
        {
          heading: "Αγγελίες, συμφωνίες και παραδόσεις",
          paragraphs: [
            "Ο πωλητής ευθύνεται για την ακρίβεια της αγγελίας (είδος, ποσότητα, σύσταση, διαθεσιμότητα, τιμή). Οι τυπικές τιμές ξηράς ουσίας και απόδοσης βιοαερίου που εμφανίζει η πλατφόρμα είναι ενδεικτικές.",
            "Η συμφωνία προμήθειας δεσμεύει αγοραστή και πωλητή με τους όρους που αποδέχτηκαν. Η μεταφορά κανονίζεται μεταξύ τους, όπως ορίζει η συμφωνία.",
            "Κάθε παράδοση καταγράφεται με την ποσότητα που ζυγίστηκε και επιβεβαιώνεται από την άλλη πλευρά. Αν δεν αμφισβητηθεί μέσα σε 72 ώρες, θεωρείται επιβεβαιωμένη.",
          ],
        },
        {
          heading: "Συμμόρφωση με τη νομοθεσία",
          paragraphs: [
            "Αγοραστές και πωλητές ευθύνονται αποκλειστικά για τη συμμόρφωση με τη νομοθεσία για τα απόβλητα και τα ζωικά υποπροϊόντα. Αυτό περιλαμβάνει: άδειες, εγκρίσεις εγκαταστάσεων και οχημάτων, εμπορικά έγγραφα διακίνησης ζωικών υποπροϊόντων (Κανονισμός (ΕΚ) 1069/2009), καταχωρίσεις στο Ηλεκτρονικό Μητρώο Αποβλήτων, και φορολογικά παραστατικά για κάθε παράδοση.",
          ],
        },
        {
          heading: "Πληρωμές και προμήθεια",
          paragraphs: [
            "Οι πληρωμές γίνονται μέσω της Stripe. Η τιμή ανά μονάδα μπορεί να είναι θετική (πληρώνει ο αγοραστής) ή αρνητική (ο πωλητής πληρώνει για την παραλαβή). Όποιος πληρώνει χρεώνεται μετά την επιβεβαίωση κάθε παράδοσης, με κάρτα ή εντολή SEPA.",
            "Η πλατφόρμα παρακρατά προμήθεια από κάθε πληρωμή, σύμφωνα με τον τιμοκατάλογο που ισχύει κατά τη σύναψη της συμφωνίας. Όσοι εισπράττουν πρέπει να ολοκληρώσουν τον έλεγχο ταυτότητας της Stripe και ισχύουν και οι όροι της Stripe.",
          ],
        },
        {
          heading: "Διαφωνίες",
          paragraphs: [
            "Αν αμφισβητηθεί μια παράδοση, η πληρωμή της αναστέλλεται και η πλατφόρμα μπορεί να μεσολαβήσει. Η τελική επίλυση των διαφορών είναι υπόθεση των μερών.",
          ],
        },
        {
          heading: "Ευθύνη",
          paragraphs: [
            "Στο μέτρο που επιτρέπει ο νόμος, η πλατφόρμα δεν ευθύνεται για την ποιότητα ή ποσότητα των πρώτων υλών, για τη μη εκτέλεση συμφωνιών από τα μέρη, ή για έμμεσες ζημίες. Η συνολική ευθύνη της περιορίζεται στις προμήθειες που εισέπραξε από εσάς τους τελευταίους 12 μήνες.",
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
          heading: "Ενδεικτικές τιμές",
          paragraphs: [
            "Η ξηρά ουσία και η απόδοση βιοαερίου που εμφανίζονται για κάθε είδος πρώτης ύλης είναι τυπικές τιμές από τη βιβλιογραφία. Η πραγματική σύσταση διαφέρει ανάλογα με τη φάρμα, την εποχή, τη διατροφή των ζώων και την αποθήκευση. Για αποφάσεις σίτισης μονάδας, χρησιμοποιήστε εργαστηριακή ανάλυση.",
          ],
        },
        {
          heading: "Η πλατφόρμα δεν είναι συμβαλλόμενο μέρος",
          paragraphs: [
            "Οι συμφωνίες συνάπτονται απευθείας μεταξύ αγοραστών και πωλητών. Η πλατφόρμα δεν εγγυάται την ποιότητα, την ποσότητα ή την έγκαιρη παράδοση, ούτε ελέγχει τη νομιμότητα της διακίνησης.",
            "Τίποτα στην πλατφόρμα δεν αποτελεί νομική, φορολογική ή τεχνική συμβουλή.",
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
          heading: "Χάρτες",
          paragraphs: [
            "Οι χάρτες φορτώνονται από τον πάροχο χαρτών. Για να σας σταλούν οι εικόνες του χάρτη, ο πάροχος λαμβάνει τη διεύθυνση IP σας. Δεν αποθηκεύονται cookies από τον χάρτη.",
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
            "Account data: full name, email, an encrypted password (or your Google identifier).",
            "Business data: legal name, VAT number (ΑΦΜ), phone, role (buyer or seller) and verification status.",
            "Sites: name, type, municipality, address and coordinates. Other users don't see the exact location before an agreement.",
            "Listings, offers, agreements, deliveries and messages between the parties.",
            "Payment data: handled by Stripe (seller identity checks, IBAN, cards/SEPA mandates). We never store card or bank account details.",
            "Technical data: server logs (IP address, time, page) for security purposes.",
          ],
        },
        {
          heading: "Why we use it and on what legal basis",
          paragraphs: [
            "To run the marketplace (performance of a contract, GDPR Art. 6(1)(b)): listings, offers, agreements, deliveries, payments and notifications.",
            "To verify businesses and prevent fraud (legitimate interest, Art. 6(1)(f)).",
            "For tax obligations, such as invoicing our commission and platform reporting to the Greek tax authority under DAC7 / Law 5047/2023 (legal obligation, Art. 6(1)(c)).",
            "For optional usage statistics, only with your consent (Art. 6(1)(a)).",
          ],
        },
        {
          heading: "Who we share it with",
          paragraphs: [
            "Your counterparty: when you make an offer or an agreement, the other side sees your business name and the contact details needed to carry it out.",
            "Processors: Supabase (database and sign-in, EU servers), Stripe (payments), our email delivery provider, our map provider and our hosting provider.",
            "The Greek tax authority where the law requires it (e.g. DAC7). We never sell your data.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "For as long as you have an account. Transaction and invoicing records are kept as long as tax law requires, even after the account is deleted.",
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
            "The platform is an online marketplace that connects producers of feedstock (e.g. manure, slurry, food industry residues) with biogas plants. It helps them make supply agreements, record deliveries and handle payments.",
            "The platform does not buy or sell feedstock and is not a party to agreements between buyers and sellers.",
          ],
        },
        {
          heading: "Accounts and verification",
          paragraphs: [
            "The platform is for businesses and professionals (including farmers). You must provide accurate business details, including your VAT number. We may check them, request documents and suspend accounts with inaccurate details.",
            "Each business has one role (buyer or seller), chosen at signup.",
          ],
        },
        {
          heading: "Listings, agreements and deliveries",
          paragraphs: [
            "Sellers are responsible for accurate listings (type, quantity, composition, availability, price). The typical dry matter and biogas yield figures shown by the platform are indicative.",
            "A supply agreement binds the buyer and seller to the terms they accepted. They arrange transport between themselves, as set out in the agreement.",
            "Each delivery is recorded with its weighed quantity and confirmed by the other side. If it isn't disputed within 72 hours, it is considered confirmed.",
          ],
        },
        {
          heading: "Legal compliance",
          paragraphs: [
            "Buyers and sellers are solely responsible for complying with waste and animal by-product legislation. This includes permits, approvals of facilities and vehicles, commercial documents for animal by-products (Regulation (EC) 1069/2009), entries in the Greek Electronic Waste Registry, and tax documents for every delivery.",
          ],
        },
        {
          heading: "Payments and commission",
          paragraphs: [
            "Payments are processed by Stripe. The price per unit can be positive (the buyer pays) or negative (the seller pays for collection). The paying party is charged after each delivery is confirmed, by card or SEPA mandate.",
            "The platform keeps a commission from each payment, according to the fees in force when the agreement is made. Parties who receive money must complete Stripe's identity checks, and Stripe's terms also apply.",
          ],
        },
        {
          heading: "Disputes",
          paragraphs: [
            "If a delivery is disputed, its payment is put on hold and the platform may mediate. Final resolution of disputes is a matter between the parties.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "To the extent permitted by law, the platform is not liable for the quality or quantity of feedstock, for parties not performing agreements, or for indirect damages. Its total liability is limited to the commission it collected from you in the last 12 months.",
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
          heading: "Indicative values",
          paragraphs: [
            "The dry matter and biogas yield shown for each feedstock type are typical literature values. Real composition varies with the farm, the season, animal diet and storage. Use a lab analysis for plant feeding decisions.",
          ],
        },
        {
          heading: "The platform is not a party",
          paragraphs: [
            "Agreements are made directly between buyers and sellers. The platform doesn't guarantee quality, quantity or timely delivery, and doesn't check the legality of shipments.",
            "Nothing on the platform is legal, tax or technical advice.",
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
          heading: "Maps",
          paragraphs: [
            "Maps are loaded from our map provider, which receives your IP address in order to send you the map images. The map sets no cookies.",
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
