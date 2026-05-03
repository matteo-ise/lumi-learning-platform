import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HotKeyButtons } from '../components/HotKeyButtons'
import { apiFetch } from '../services/api'
import { LoadingScreen } from '../components/LoadingScreen'

// --- Typen ---

interface Profile {
  name: string
  avatar: string
  grade: number
  federal_state: string
  wizard_completed: boolean
}

interface Task {
  q: string
  p: number
  ans: string
  hint: string
  explanation: string
  leitidee: string
  anforderungsbereich: 'I' | 'II' | 'III'
}

// --- KMK 2022: Bildungsstandards Mathematik Primarbereich ---
// Quelle: KMK-Beschluss 23.06.2022, Abschnitt 3.1 + 3.4

type Leitidee =
  | 'Zahlen und Operationen'
  | 'Raum und Form'
  | 'Groessen und Messen'
  | 'Daten und Zufall'
  | 'Muster und Strukturen'

interface KmkKlasse {
  readonly range: number
  readonly label: string
  readonly leitideen: readonly Leitidee[]
  readonly themen: readonly string[]
}

const KMK_CONFIG: Readonly<Record<number, KmkKlasse>> = {
  1: {
    range: 20,
    label: '1. Klasse',
    leitideen: ['Zahlen und Operationen', 'Raum und Form', 'Groessen und Messen', 'Muster und Strukturen'],
    themen: [
      'Zahlbegriff bis 20', 'Zerlegungen', 'Addition/Subtraktion',
      'Verdoppeln/Halbieren', 'Formen erkennen', 'Laengen vergleichen',
      'Muster fortsetzen',
    ],
  },
  2: {
    range: 100,
    label: '2. Klasse',
    leitideen: ['Zahlen und Operationen', 'Raum und Form', 'Groessen und Messen', 'Daten und Zufall', 'Muster und Strukturen'],
    themen: [
      'Stellenwerttafel Z/E', 'Kleines Einmaleins', 'Uhr/Geld',
      'cm/m', 'Einfache Symmetrie', 'Strichlisten',
    ],
  },
  3: {
    range: 1_000,
    label: '3. Klasse',
    leitideen: ['Zahlen und Operationen', 'Raum und Form', 'Groessen und Messen', 'Daten und Zufall', 'Muster und Strukturen'],
    themen: [
      'Schriftliche Addition/Subtraktion', 'Halbschriftliche Multiplikation',
      'Anteile (Halbe, Viertel)', 'Flaeche + Umfang', 'Diagramme lesen',
      'Achsensymmetrie', 'Zahlenfolgen',
    ],
  },
  4: {
    range: 1_000_000,
    label: '4. Klasse',
    leitideen: ['Zahlen und Operationen', 'Raum und Form', 'Groessen und Messen', 'Daten und Zufall', 'Muster und Strukturen'],
    themen: [
      'Schriftliche Multiplikation/Division', 'Stellenwerttafel HT-E',
      'Alle Groessen umrechnen', 'Sachaufgaben', 'Einfache Kombinatorik',
      'Wahrscheinlichkeitsbegriffe', 'Anteile (keine Bruchrechnung)',
    ],
  },
}

// --- Bundesland-Profile ---
// Quelle: IQB-Bildungstrend 2021 (Stanat et al. 2022), Landeslehrplaene, Schreibschrift-Regelungen
// Modifier im Korridor 0.95-1.05, abgeleitet aus IQB-Mittelwerten
// Modifier wirkt auf AB-Verteilung, NICHT auf den Zahlenraum

interface BundeslandProfil {
  readonly erstschreibschrift: string
  readonly fontFamily: string
  readonly lehrplanName: string
  readonly lehrplanStand: string
  readonly lehrplanUrl: string
  readonly iqb_cluster: 'oben' | 'mitte' | 'unten'
  readonly modifier: number
}

const BUNDESLAND_PROFIL: Readonly<Record<string, BundeslandProfil>> = {
  'Baden-Württemberg': {
    erstschreibschrift: 'je nach Schule (haeufig VA)',
    fontFamily: 'Vereinfachte Ausgangsschrift',
    lehrplanName: 'Bildungsplan 2016',
    lehrplanStand: 'Uebergang ab 2024/25',
    lehrplanUrl: 'https://www.bildungsplaene-bw.de/,Lde/Startseite/BP2016BW_ALLG/BP2016BW_ALLG_GS',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Bayern': {
    erstschreibschrift: 'SAS oder VA waehlbar',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'LehrplanPLUS Grundschule',
    lehrplanStand: '2014, gepflegt',
    lehrplanUrl: 'https://www.lehrplanplus.bayern.de/schulart/grundschule',
    iqb_cluster: 'oben',
    modifier: 1.03,
  },
  'Berlin': {
    erstschreibschrift: 'SAS verbindlich',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Rahmenlehrplan 1-10',
    lehrplanStand: '2015, Mathe-Anpassung 2023',
    lehrplanUrl: 'https://bildungsserver.berlin-brandenburg.de/rlp-online/startseite',
    iqb_cluster: 'unten',
    modifier: 0.97,
  },
  'Brandenburg': {
    erstschreibschrift: 'SAS oder VA waehlbar',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Rahmenlehrplan 1-10',
    lehrplanStand: '2015, Mathe-Anpassung 2023',
    lehrplanUrl: 'https://bildungsserver.berlin-brandenburg.de/rlp-online/startseite',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Bremen': {
    erstschreibschrift: 'je nach Schule',
    fontFamily: 'Vereinfachte Ausgangsschrift',
    lehrplanName: 'Bildungsplan Grundschule',
    lehrplanStand: '2021/22',
    lehrplanUrl: 'https://www.lis.bremen.de/schulqualitaet/curriculumentwicklung/bildungsplaene-702',
    iqb_cluster: 'unten',
    modifier: 0.97,
  },
  'Hamburg': {
    erstschreibschrift: 'SAS verbindlich',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Bildungsplan Grundschule 2022',
    lehrplanStand: 'in Kraft 1.8.2023',
    lehrplanUrl: 'https://www.hamburg.de/resource/blob/31566/c8271883ba7f049e1b71fa484b7e4b3a/bildungsplan-grundschule-mathematik-data.pdf',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Hessen': {
    erstschreibschrift: 'je nach Schule',
    fontFamily: 'Vereinfachte Ausgangsschrift',
    lehrplanName: 'Kerncurriculum',
    lehrplanStand: 'aktuell',
    lehrplanUrl: 'https://kultusministerium.hessen.de/schulsystem/bildungsstandards-und-kerncurricula',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Mecklenburg-Vorpommern': {
    erstschreibschrift: 'SAS oder VA waehlbar',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Rahmenplan Grundschule',
    lehrplanStand: 'aktuell',
    lehrplanUrl: 'https://www.bildung-mv.de/lehrer/schule-und-unterricht/rahmenlehrplaene/',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Niedersachsen': {
    erstschreibschrift: 'je nach Schule',
    fontFamily: 'Vereinfachte Ausgangsschrift',
    lehrplanName: 'Kerncurriculum 1-4',
    lehrplanStand: 'in Kraft 1.8.2025',
    lehrplanUrl: 'https://cuvo.nibis.de/cuvo.php?skey_lev0_0=Schulbereich&svalue_lev0_0=Primarbereich',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Nordrhein-Westfalen': {
    erstschreibschrift: 'je nach Schule',
    fontFamily: 'Vereinfachte Ausgangsschrift',
    lehrplanName: 'Lehrplan Primarstufe',
    lehrplanStand: 'in Kraft 1.8.2021',
    lehrplanUrl: 'https://www.schulentwicklung.nrw.de/lehrplaene/lehrplannavigator-grundschule/',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Rheinland-Pfalz': {
    erstschreibschrift: 'je nach Schule',
    fontFamily: 'Vereinfachte Ausgangsschrift',
    lehrplanName: 'Rahmenplan Grundschule',
    lehrplanStand: 'aktuell',
    lehrplanUrl: 'https://grundschule.bildung-rp.de/rahmenplan.html',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Saarland': {
    erstschreibschrift: 'SAS verbindlich',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Kernlehrplan Grundschule',
    lehrplanStand: 'aktuell',
    lehrplanUrl: 'https://www.saarland.de/mbk/DE/portale/bildungsserver/unterricht-und-bildungsthemen/lehrplaene-und-handreichungen/grundschule/grundschule_node.html',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Sachsen': {
    erstschreibschrift: 'SAS verbindlich',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Lehrplan Grundschule',
    lehrplanStand: 'aktiv ab 2025/26',
    lehrplanUrl: 'https://www.schulportal.sachsen.de/lplandb/',
    iqb_cluster: 'oben',
    modifier: 1.03,
  },
  'Sachsen-Anhalt': {
    erstschreibschrift: 'SAS verbindlich',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Fachlehrplan Grundschule',
    lehrplanStand: '2019',
    lehrplanUrl: 'https://www.bildung-lsa.de/lehrplaene___rahmenrichtlinien.html',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Schleswig-Holstein': {
    erstschreibschrift: 'je nach Schule',
    fontFamily: 'Vereinfachte Ausgangsschrift',
    lehrplanName: 'Fachanforderungen Deutsch / Mathe',
    lehrplanStand: 'aktuell',
    lehrplanUrl: 'https://fachportal.lernnetz.de/sh/fachanforderungen.html',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
  'Thüringen': {
    erstschreibschrift: 'SAS oder VA waehlbar',
    fontFamily: 'Schulausgangsschrift',
    lehrplanName: 'Lehrplan Grundschule',
    lehrplanStand: 'aktuell',
    lehrplanUrl: 'https://www.schulportal-thueringen.de/lehrplaene',
    iqb_cluster: 'mitte',
    modifier: 1.0,
  },
}

// --- Aufgaben-Generator: Klasse x Leitidee x Anforderungsbereich ---
// Quelle: KMK 2022 Abschnitt 6, VERA-3 Aufgabenbeispiele (IQB)

interface TaskTemplate {
  readonly leitidee: Leitidee
  readonly ab: 'I' | 'II' | 'III'
  readonly generator: (grade: number, range: number) => { q: string; ans: string; hint: string; explanation: string }
  readonly points: number
  readonly grades: readonly number[]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const TASK_TEMPLATES: readonly TaskTemplate[] = [
  // Leitidee 1: Zahlen und Operationen
  {
    leitidee: 'Zahlen und Operationen',
    ab: 'I',
    points: 2,
    grades: [1, 2, 3, 4],
    generator: (grade, range) => {
      const a = randInt(1, Math.floor(range * 0.4))
      const b = randInt(1, Math.floor(range * 0.4))
      return {
        q: `Rechne: ${a} + ${b}`,
        ans: (a + b).toString(),
        hint: grade <= 2 ? 'Zaehle weiter ab der groesseren Zahl.' : 'Rechne stellenweise: erst Einer, dann Zehner.',
        explanation: `Addition im Zahlenraum bis ${range} (AB I: Reproduzieren).`,
      }
    },
  },
  {
    leitidee: 'Zahlen und Operationen',
    ab: 'II',
    points: 3,
    grades: [2, 3, 4],
    generator: (grade, range) => {
      const base = randInt(1, Math.floor(range * 0.3))
      const factor = grade <= 2 ? 10 : 100
      return {
        q: `Wenn ${base} + ${base} = ${base * 2}, was ist dann ${base * factor} + ${base * factor}?`,
        ans: (base * factor * 2).toString(),
        hint: 'Nutze die Analogie: gleiche Rechnung, groesserer Zahlenraum.',
        explanation: `Zusammenhaenge erkennen durch Analogiebildung (AB II).`,
      }
    },
  },
  {
    leitidee: 'Zahlen und Operationen',
    ab: 'III',
    points: 5,
    grades: [3, 4],
    generator: (_grade, range) => {
      const near = Math.pow(10, Math.floor(Math.log10(range * 0.5)))
      const a = near - 1
      const b = randInt(10, Math.floor(range * 0.1))
      return {
        q: `Erklaere, warum man ${a} + ${b} geschickt rechnen kann, indem man erst ${near} + ${b} rechnet und dann 1 abzieht. Was ist das Ergebnis?`,
        ans: (a + b).toString(),
        hint: `${a} ist fast ${near}. Rechne erst mit der glatten Zahl.`,
        explanation: `Rechenstrategien begruenden und uebertragen (AB III: Verallgemeinern und Reflektieren).`,
      }
    },
  },

  // Leitidee 2: Raum und Form
  {
    leitidee: 'Raum und Form',
    ab: 'I',
    points: 2,
    grades: [1, 2, 3, 4],
    generator: (grade) => {
      const forms = grade <= 2
        ? [['Quadrat', '4 gleich lange Seiten, 4 rechte Winkel'], ['Dreieck', '3 Seiten, 3 Ecken'], ['Kreis', 'rund, keine Ecken']]
        : [['Wuerfel', '6 gleiche quadratische Flaechen'], ['Quader', '6 Flaechen, gegenueberliegen gleich'], ['Zylinder', '2 Kreise und 1 Mantelflaeche']]
      const [form, eigenschaft] = forms[randInt(0, forms.length - 1)]
      return {
        q: `Welche Form hat ${grade <= 2 ? 'diese Eigenschaft' : 'diesen Koerper'}: ${eigenschaft}?`,
        ans: form,
        hint: `Denke an die Anzahl der ${grade <= 2 ? 'Seiten und Ecken' : 'Flaechen'}.`,
        explanation: `Geometrische ${grade <= 2 ? 'Figuren' : 'Koerper'} erkennen und benennen (AB I).`,
      }
    },
  },
  {
    leitidee: 'Raum und Form',
    ab: 'II',
    points: 4,
    grades: [3, 4],
    generator: () => {
      const seite = randInt(3, 12)
      return {
        q: `Ein Quadrat hat eine Seitenlaenge von ${seite} cm. Wie gross ist der Umfang?`,
        ans: (seite * 4).toString(),
        hint: 'Ein Quadrat hat 4 gleich lange Seiten. Umfang = 4 mal Seitenlaenge.',
        explanation: 'Umfangberechnung bei regelmaessigen Figuren (AB II: Zusammenhaenge herstellen).',
      }
    },
  },

  // Leitidee 3: Groessen und Messen
  {
    leitidee: 'Groessen und Messen',
    ab: 'I',
    points: 2,
    grades: [2, 3, 4],
    generator: (grade) => {
      if (grade === 2) {
        const cm = randInt(10, 99)
        return {
          q: `Wie viel sind ${cm} cm in m und cm? (Schreibe z.B. 1m 23cm als "1 23")`,
          ans: `${Math.floor(cm / 100)} ${cm % 100}`,
          hint: '100 cm = 1 m.',
          explanation: 'Laengenumrechnung cm nach m (AB I).',
        }
      }
      const kg = randInt(1, 9)
      const g = randInt(1, 9) * 100
      return {
        q: `Rechne um: ${kg} kg ${g} g = wie viele Gramm insgesamt?`,
        ans: (kg * 1000 + g).toString(),
        hint: '1 kg = 1000 g. Rechne zuerst die kg in g um.',
        explanation: 'Gewichtsumrechnung kg/g (AB I: direkte Anwendung).',
      }
    },
  },
  {
    leitidee: 'Groessen und Messen',
    ab: 'II',
    points: 4,
    grades: [3, 4],
    generator: (grade) => {
      const preis = grade === 3 ? randInt(2, 9) : randInt(5, 25)
      const anzahl = randInt(3, 8)
      const budget = preis * anzahl + randInt(1, 10)
      return {
        q: `Ein Heft kostet ${preis} Euro. Du hast ${budget} Euro. Wie viele Hefte kannst du kaufen und wie viel Wechselgeld bekommst du?`,
        ans: `${Math.floor(budget / preis)} ${budget % preis}`,
        hint: 'Teile dein Budget durch den Preis. Der Rest ist das Wechselgeld.',
        explanation: 'Sachaufgabe mit Division und Rest (AB II). Antwort: Anzahl + Wechselgeld.',
      }
    },
  },

  // Leitidee 4: Daten und Zufall
  {
    leitidee: 'Daten und Zufall',
    ab: 'I',
    points: 2,
    grades: [2, 3, 4],
    generator: () => {
      const a = randInt(3, 12)
      const b = randInt(3, 12)
      const c = randInt(3, 12)
      return {
        q: `In einer Umfrage moegen ${a} Kinder Aepfel, ${b} Kinder Bananen und ${c} Kinder Erdbeeren. Wie viele Kinder wurden befragt?`,
        ans: (a + b + c).toString(),
        hint: 'Zaehle alle Kinder zusammen.',
        explanation: 'Daten aus einer Strichliste/Tabelle entnehmen und auswerten (AB I).',
      }
    },
  },
  {
    leitidee: 'Daten und Zufall',
    ab: 'III',
    points: 5,
    grades: [3, 4],
    generator: () => {
      const mathe = randInt(5, 15)
      const deutsch = randInt(5, 15)
      const sport = randInt(5, 15)
      return {
        q: `Strichliste Lieblingsfach: Mathe ${mathe}, Deutsch ${deutsch}, Sport ${sport}. Was kann man daraus folgern? Was ist das beliebteste Fach? (Schreibe den Namen)`,
        ans: mathe >= deutsch && mathe >= sport ? 'Mathe' : deutsch >= sport ? 'Deutsch' : 'Sport',
        hint: 'Vergleiche die Zahlen. Das groesste Ergebnis ist das beliebteste.',
        explanation: 'Aus Daten Aussagen ableiten und reflektieren (AB III).',
      }
    },
  },

  // Leitidee 5: Muster und Strukturen
  {
    leitidee: 'Muster und Strukturen',
    ab: 'II',
    points: 3,
    grades: [1, 2, 3, 4],
    generator: (grade) => {
      const step = grade <= 2 ? randInt(2, 5) : randInt(3, 12)
      const start = randInt(1, 10)
      const sequence = [start, start + step, start + 2 * step, start + 3 * step, start + 4 * step]
      return {
        q: `Setze die Zahlenfolge fort: ${sequence.join(', ')}, ...  Wie lautet die naechste Zahl?`,
        ans: (start + 5 * step).toString(),
        hint: `Finde heraus, um wie viel jede Zahl groesser wird.`,
        explanation: 'Arithmetische Muster erkennen und fortsetzen (AB II).',
      }
    },
  },
]

function generateExamTasks(grade: number, modifier: number): Task[] {
  const config = KMK_CONFIG[grade] || KMK_CONFIG[3]
  const available = TASK_TEMPLATES.filter((t) => t.grades.includes(grade))

  // Sicherstellen: mindestens 2 verschiedene Leitideen, mindestens 1x AB II oder III
  const usedLeitideen = new Set<string>()
  const selected: Task[] = []

  // 1. Eine AB-II oder AB-III Aufgabe garantieren
  const abHigher = available.filter((t) => t.ab !== 'I')
  if (abHigher.length > 0) {
    const t = abHigher[randInt(0, abHigher.length - 1)]
    const generated = t.generator(grade, config.range)
    selected.push({ ...generated, p: t.points, leitidee: t.leitidee, anforderungsbereich: t.ab })
    usedLeitideen.add(t.leitidee)
  }

  // 2. Eine Aufgabe aus einer anderen Leitidee garantieren
  const otherLeitidee = available.filter((t) => !usedLeitideen.has(t.leitidee))
  if (otherLeitidee.length > 0) {
    const t = otherLeitidee[randInt(0, otherLeitidee.length - 1)]
    const generated = t.generator(grade, config.range)
    selected.push({ ...generated, p: t.points, leitidee: t.leitidee, anforderungsbereich: t.ab })
    usedLeitideen.add(t.leitidee)
  }

  // 3. Restliche 2 Aufgaben auffuellen
  const remaining = available.filter(
    (t) => !selected.some((s) => s.leitidee === t.leitidee && s.anforderungsbereich === t.ab),
  )
  while (selected.length < 4 && remaining.length > 0) {
    const idx = randInt(0, remaining.length - 1)
    const t = remaining[idx]

    // Modifier: hoeher = mehr AB-II/III, niedriger = mehr AB-I
    if (t.ab === 'I' && modifier > 1.02 && Math.random() > 0.5) {
      remaining.splice(idx, 1)
      continue
    }
    if (t.ab === 'III' && modifier < 0.98 && Math.random() > 0.5) {
      remaining.splice(idx, 1)
      continue
    }

    const generated = t.generator(grade, config.range)
    selected.push({ ...generated, p: t.points, leitidee: t.leitidee, anforderungsbereich: t.ab })
    remaining.splice(idx, 1)
  }

  // Fallback: wenn weniger als 4, mit AB-I auffuellen
  while (selected.length < 4) {
    const fallback = available.filter((t) => t.ab === 'I')
    if (fallback.length === 0) break
    const t = fallback[randInt(0, fallback.length - 1)]
    const generated = t.generator(grade, config.range)
    selected.push({ ...generated, p: t.points, leitidee: t.leitidee, anforderungsbereich: t.ab })
  }

  // Nach Anforderungsbereich sortieren (I → II → III)
  const abOrder = { I: 1, II: 2, III: 3 }
  return selected.sort((a, b) => abOrder[a.anforderungsbereich] - abOrder[b.anforderungsbereich])
}

// --- Komponente ---

export function ExamPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [examState, setExamState] = useState<'idle' | 'running' | 'finished'>('idle')
  const [loading, setLoading] = useState(false)
  const [allowHints, setAllowHints] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>(['', '', '', ''])
  const [visibleHints, setVisibleHints] = useState<boolean[]>([false, false, false, false])
  const [timeLeft, setTimeLeft] = useState(1200)
  const [showResultsDetail, setShowResultsDetail] = useState(false)
  const [showExplanations, setShowExplanations] = useState(false)

  useEffect(() => {
    apiFetch<Profile>('/api/profile').then(setProfile).catch(() => navigate('/app'))
  }, [navigate])

  useEffect(() => {
    if (examState !== 'running') return
    if (timeLeft <= 0) {
      finishExam()
      return
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [examState, timeLeft])

  if (!profile) return <LoadingScreen />

  const config = KMK_CONFIG[profile.grade] || KMK_CONFIG[3]
  const bundesland = BUNDESLAND_PROFIL[profile.federal_state]
  const modifier = bundesland?.modifier ?? 1.0

  const startExam = async (retryTasks?: Task[]) => {
    setLoading(true)
    if (!retryTasks) {
      await new Promise((r) => setTimeout(r, 800))
      const generated = generateExamTasks(profile.grade, modifier)
      setTasks(generated)
    } else {
      setTasks(retryTasks)
    }
    setUserAnswers(['', '', '', ''])
    setVisibleHints([false, false, false, false])
    setTimeLeft(1200)
    setShowResultsDetail(false)
    setShowExplanations(false)
    setExamState('running')
    setLoading(false)
  }

  const currentScore = tasks.reduce((s, t, i) => (userAnswers[i]?.trim() === t.ans ? s + t.p : s), 0)
  const maxScore = tasks.reduce((a, b) => a + b.p, 0)

  const finishExam = async () => {
    setExamState('finished')
    try {
      await apiFetch('/api/exam/results', {
        method: 'POST',
        body: JSON.stringify({ score: currentScore, total: maxScore, grade: profile.grade }),
      })
    } catch {
      // Ergebnis-Speicherung ist nicht kritisch fuer die UX
    }
  }

  const handleHotkey = (type: string) => {
    if (type === 'NEW_EXAM') {
      setExamState('idle')
      setTasks([])
    }
    if (type === 'RETRY_EXAM') startExam(tasks)
    if (type === 'SHOW_SOLUTIONS') setShowResultsDetail(!showResultsDetail)
    if (type === 'EXPLAIN') setShowExplanations(!showExplanations)
  }

  const getFeedback = (score: number, total: number) => {
    const ratio = total > 0 ? score / total : 0
    if (ratio === 1) return { emoji: '🏆', text: 'Perfekt! Du bist ein echter Mathe-Profi!' }
    if (ratio >= 0.7) return { emoji: '🥈', text: 'Klasse Leistung! Du hast fast alles richtig.' }
    if (ratio >= 0.4) return { emoji: '🥉', text: 'Gut gemacht! Ein bisschen Übung noch, dann knackst du die 100%.' }
    return { emoji: '📚', text: 'Kopf hoch! Jeder Meister hat mal klein angefangen. Lass uns das nochmal üben.' }
  }

  const feedback = getFeedback(currentScore, maxScore)

  return (
    <div className="min-h-screen bg-gray px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/app')}
            className="absolute left-6 top-6 text-dark/50 hover:text-dark font-bold text-lg transition-colors sm:left-auto sm:relative sm:float-left"
          >
            ← Zurück
          </button>
          <h1 className="text-3xl font-extrabold text-orange">🎓 LUMI Exam</h1>
          <div className="flex justify-center gap-3 mt-3 flex-wrap">
            <span className="px-3 py-1 bg-gray rounded-full text-sm text-dark/60">📍 {profile.federal_state}</span>
            <span className="px-3 py-1 bg-gray rounded-full text-sm text-dark/60">🏫 {config.label}</span>
            <span className="px-3 py-1 bg-blue-100 rounded-full text-sm text-blue-700">📘 Mathematik</span>
          </div>
          {bundesland && (
            <div className="mt-2">
              <p className="text-xs text-dark/40">
                Lehrplan:{' '}
                <a href={bundesland.lehrplanUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {bundesland.lehrplanName}
                </a>{' '}
                ({bundesland.lehrplanStand}) · Schrift: {bundesland.erstschreibschrift}
              </p>
              <p className="text-lg text-dark/60 mt-1" style={{ fontFamily: `'${bundesland.fontFamily}', cursive` }}>
                Beispiel: Hallo Welt
              </p>
            </div>
          )}
        </div>

        {/* Idle */}
        {examState === 'idle' && (
          <div className="text-center">
            <div className="bg-orange/10 border-2 border-dashed border-orange rounded-2xl p-8 mb-6">
              <h2 className="text-xl font-bold text-orange mb-2">Bereit für den 20-Minuten-Test?</h2>
              <p className="text-dark/60 mb-3">
                LUMI erstellt dir 4 Aufgaben aus verschiedenen Bereichen (Rechnen, Geometrie, Groessen, Daten, Muster),
                die genau zu deinem Lernstand passen.
              </p>
              <p className="text-xs text-dark/40 italic mb-4">
                Aufgaben basieren auf den KMK-Bildungsstandards 2022 mit drei Anforderungsbereichen.
              </p>
              <label className="inline-flex items-center gap-2 cursor-pointer text-base">
                <input
                  type="checkbox"
                  checked={allowHints}
                  onChange={() => setAllowHints(!allowHints)}
                  className="w-5 h-5 accent-primary"
                />
                💡 Hilfe-Tipps erlauben?
              </label>
            </div>
            <button
              onClick={() => startExam()}
              disabled={loading}
              className="bg-orange text-white px-10 py-4 rounded-2xl font-extrabold text-xl shadow-lg hover:bg-orange/90 transition-all disabled:opacity-50"
            >
              {loading ? 'LUMI bereitet alles vor...' : 'Test jetzt starten 🚀'}
            </button>
          </div>
        )}

        {/* Running */}
        {examState === 'running' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className={`text-lg font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>
                ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-lg font-bold text-mint">⭐ Max: {maxScore} Pkt.</span>
            </div>

            {tasks.map((task, i) => (
              <div key={i} className="mb-5 p-6 bg-white rounded-2xl border-2 border-gray">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-orange">Aufgabe {i + 1}</span>
                  <span className="text-dark/40 text-sm">{task.p} Pkt.</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{task.leitidee}</span>
                  <span className="text-xs px-2 py-0.5 bg-orange/10 text-orange rounded-full">AB {task.anforderungsbereich}</span>
                </div>
                <p className="text-lg mb-4">{task.q}</p>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={userAnswers[i]}
                    onChange={(e) => {
                      const a = [...userAnswers]
                      a[i] = e.target.value
                      setUserAnswers(a)
                    }}
                    placeholder="Ergebnis..."
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-primary transition-colors"
                  />
                  {allowHints && (
                    <button
                      onClick={() => {
                        const h = [...visibleHints]
                        h[i] = !h[i]
                        setVisibleHints(h)
                      }}
                      className={`px-3 py-3 rounded-xl border-none cursor-pointer transition-colors ${visibleHints[i] ? 'bg-orange text-white' : 'bg-orange/10'}`}
                    >
                      💡
                    </button>
                  )}
                </div>
                {visibleHints[i] && (
                  <div className="mt-3 px-4 py-2 bg-orange/10 rounded-xl text-orange border-l-4 border-orange">
                    <strong>Tipp:</strong> {task.hint}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={finishExam}
              className="w-full bg-mint text-white py-4 rounded-2xl font-extrabold text-lg hover:bg-mint/90 transition-all mt-4"
            >
              Test abgeben & auswerten 🧐
            </button>
          </div>
        )}

        {/* Finished */}
        {examState === 'finished' && (
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-dark mb-2">Auswertung</h2>
            <div className="text-6xl my-4">{feedback.emoji}</div>
            <p className="text-3xl font-extrabold text-orange mb-1">
              {currentScore} / {maxScore} Punkten
            </p>
            <p className="text-base text-dark/60 italic mb-8">"{feedback.text}"</p>

            {showResultsDetail && (
              <div className="text-left bg-gray rounded-2xl p-6 mb-6 border border-gray-200">
                <h3 className="font-bold text-lg mb-4">Detaillierte Analyse:</h3>
                {tasks.map((t, i) => (
                  <div key={i} className="py-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex justify-between font-bold">
                      <span>Aufgabe {i + 1}:</span>
                      <span>{userAnswers[i]?.trim() === t.ans ? `✅ +${t.p} Pkt.` : `❌ 0 / ${t.p} Pkt.`}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{t.leitidee}</span>
                      <span className="text-xs px-2 py-0.5 bg-orange/10 text-orange rounded-full">AB {t.anforderungsbereich}</span>
                    </div>
                    <p className="text-sm text-dark/50 mt-1">
                      Richtig wäre: {t.ans} (Deine Antwort: {userAnswers[i] || '–'})
                    </p>
                    {showExplanations && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-xl text-blue-800 text-sm">
                        <strong>🧠 LUMIs Erklärung:</strong> {t.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-dark/40">Nutze die Hotkeys zur Analyse:</p>
              <HotKeyButtons mode="exam" examState="finished" onHotkey={handleHotkey} />
              <button
                onClick={() => handleHotkey('RETRY_EXAM')}
                className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-primary/90 transition-all"
              >
                🔄 Dieselbe Prüfung nochmal versuchen
              </button>
            </div>

            <button
              onClick={() => navigate('/app')}
              className="mt-6 text-dark/40 hover:text-dark underline text-sm transition-colors"
            >
              Zurück zum Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
