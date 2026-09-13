/**
 * Alle globalen Zahlen, die im Spieltest verändert werden.
 * Rezeptdauern, Ernteraten, Kosten und Stücklisten stehen in data/.
 */
export const BALANCE = {
  /** Fester Zeitschritt der Engine im laufenden Spiel */
  tickSeconds: 0.25,
  /** Zeitschritt der Nachsimulation nach der Rückkehr */
  offlineStepSeconds: 1,
  /** Schienen je Kilometer Strecke. Ein Abschnitt ist eine Schiene, also 10 m. */
  railsPerKm: 100,
  /** Lagerkapazität je Ware ohne Lagerwagen */
  storeBaseCap: 200,
  /** Zusätzliche Kapazität je Ware pro Lagerwagen */
  storeCapPerLagerwagen: 200,
  /** Tempo je Wagenstufe: Stufe n arbeitet mit 1 + step * (n - 1) */
  levelSpeedStep: 0.2,
  maxLevel: 5,
  /** Tempo-Bonus, wenn der Wagen davor eine Zutat liefert */
  neighborBonus: 0.1,
  /** Erntefaktor im Heimat-Biom des Rohstoffs */
  onSiteBonus: 1.5,
  /** Höchstens so viele Aufträge in der Werkbank. Genug für eine tiefe Kette wie ein Fahrgestell. */
  workbenchQueueMax: 30,
  /** Forschungstempo ohne Konstruktionsbüro */
  workbenchResearchFactor: 0.5,
  /** Sekunden Ernte je Tipp auf die Handkurbel */
  crankSeconds: 5,
  /** Die Handkurbel lässt sich höchstens so weit vorspannen */
  crankMaxAheadSeconds: 30,
  /** Stück je Tipp, wenn der Selbstlader erforscht ist */
  crankBonusItems: 2,
  /** Kohle je Tipp auf den Tender */
  shovelCoal: 1,
  /** Anteil der Baukosten, der beim Abkoppeln zurückkommt */
  detachRefund: 0.5,
  /** Ab so vielen Sekunden Abwesenheit wird nachsimuliert */
  offlineMinSeconds: 60,
  /** Offline-Deckel ohne Nachtschicht in Stunden */
  offlineCapHoursBase: 8,
  /** Startvorrat im Lager */
  startStore: { kohle: 30, holz: 20, stein: 10 } as Record<string, number>,
} as const;
