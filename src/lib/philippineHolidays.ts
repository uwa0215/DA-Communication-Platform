// Philippine Holidays 2026
// Source: Proclamation No. 1006 by President Ferdinand R. Marcos Jr. (signed September 3, 2025)
// Eid'l Fitr and Eid'l Adha dates per separate presidential proclamations

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: "regular" | "special"; // regular = Regular Holiday, special = Special Non-Working Day
  description: string; // Brief description of the holiday's significance
}

export function getPhilippineHolidays(year: number): Holiday[] {
  // We maintain accurate, proclamation-based holidays per year
  const holidaysByYear: Record<number, Holiday[]> = {
    2026: [
      // ── Regular Holidays ──
      { date: "2026-01-01", name: "New Year's Day", type: "regular", description: "Marks the beginning of the new calendar year. Filipinos celebrate with family reunions, fireworks, and Media Noche — a midnight feast to welcome the year with prosperity and togetherness." },
      { date: "2026-03-20", name: "Eid'l Fitr", type: "regular", description: "The Festival of Breaking the Fast celebrates the end of Ramadan, the Islamic holy month of fasting. Filipino Muslims gather for communal prayers, feasts, and acts of charity." },
      { date: "2026-04-02", name: "Maundy Thursday", type: "regular", description: "Commemorates the Last Supper of Jesus Christ with his apostles. Many Filipinos attend church services, participate in the Visita Iglesia (visiting seven churches), and observe solemn reflection." },
      { date: "2026-04-03", name: "Good Friday", type: "regular", description: "Marks the crucifixion and death of Jesus Christ. It is one of the most solemn days in the Philippines, observed with processions, the Senakulo (passion play), and fasting." },
      { date: "2026-04-09", name: "Araw ng Kagitingan", type: "regular", description: "Day of Valor honoring the heroism of Filipino and American soldiers who fought in the Battle of Bataan during World War II. It commemorates their courage and sacrifice during the fall of Bataan in 1942." },
      { date: "2026-05-01", name: "Labor Day", type: "regular", description: "Celebrates the contributions and achievements of Filipino workers. Labor groups traditionally hold rallies and marches to advocate for workers' rights and better working conditions." },
      { date: "2026-05-27", name: "Eid'l Adha", type: "regular", description: "The Feast of Sacrifice commemorates Prophet Ibrahim's willingness to sacrifice his son in obedience to God. Filipino Muslims celebrate with communal prayers and the sharing of meat with family and the less fortunate." },
      { date: "2026-06-12", name: "Independence Day", type: "regular", description: "Celebrates the declaration of Philippine independence from Spanish colonial rule on June 12, 1898, in Kawit, Cavite. The national flag is raised and the anthem is sung across the country." },
      { date: "2026-08-31", name: "National Heroes Day", type: "regular", description: "Honors all Filipino heroes — known and unknown — who contributed to the country's freedom and nation-building. It is observed on the last Monday of August and commemorates the Cry of Pugad Lawin of 1896." },
      { date: "2026-11-30", name: "Bonifacio Day", type: "regular", description: "Honors Andrés Bonifacio, the Father of the Philippine Revolution, on his birth anniversary. He founded the Katipunan, the secret society that led the revolt against Spanish colonial rule in 1896." },
      { date: "2026-12-25", name: "Christmas Day", type: "regular", description: "Celebrates the birth of Jesus Christ. The Philippines holds the longest Christmas season in the world, beginning in September. Families gather for Noche Buena, exchange gifts, and attend Simbang Gabi masses." },
      { date: "2026-12-30", name: "Rizal Day", type: "regular", description: "Commemorates the martyrdom of Dr. José Rizal, the Philippines' national hero, who was executed by the Spanish colonial government on December 30, 1896. His writings inspired the Philippine Revolution." },

      // ── Special (Non-Working) Days ──
      { date: "2026-02-17", name: "Chinese New Year", type: "special", description: "Celebrates the Lunar New Year, an important cultural occasion for the Filipino-Chinese community. Festivثities include dragon dances, family reunions, the giving of ang pao (red envelopes), and festive meals." },
      { date: "2026-04-04", name: "Black Saturday", type: "special", description: "The day between Good Friday and Easter Sunday. Filipinos observe a day of mourning and quiet reflection on the death of Jesus Christ, with many attending evening Easter Vigil services." },
      { date: "2026-08-21", name: "Ninoy Aquino Day", type: "special", description: "Commemorates the assassination of Senator Benigno \"Ninoy\" Aquino Jr. on August 21, 1983, at the Manila International Airport. His death galvanized the opposition to the Marcos dictatorship and sparked the People Power Revolution of 1986." },
      { date: "2026-11-01", name: "All Saints' Day", type: "special", description: "A day to honor all saints and deceased loved ones. Filipino families visit cemeteries to clean and decorate graves, light candles, offer prayers, and spend time together remembering those who have passed." },
      { date: "2026-11-02", name: "All Souls' Day", type: "special", description: "Continues the remembrance of the faithful departed. Filipinos offer prayers and masses for the souls of loved ones, believing that prayers help souls in purgatory find peace." },
      { date: "2026-12-08", name: "Feast of the Immaculate Conception", type: "special", description: "A Catholic holy day celebrating the belief that the Virgin Mary was conceived without original sin. Many Filipinos attend special masses, and the day is part of the Simbang Gabi novena season." },
      { date: "2026-12-24", name: "Christmas Eve", type: "special", description: "The evening before Christmas Day. Filipino families prepare the Noche Buena feast, attend Misa de Gallo (midnight mass), and gather to celebrate the holiday together." },
      { date: "2026-12-31", name: "Last Day of the Year", type: "special", description: "The final day of the year is celebrated with family gatherings, festive meals, fireworks, and noise-making to drive away bad spirits and welcome the New Year with hope and joy." },

      // Note: Feb 25 (EDSA People Power Anniversary) is a Special WORKING Day in 2026, not a holiday.
    ],
    2025: [
      // ── Regular Holidays ──
      { date: "2025-01-01", name: "New Year's Day", type: "regular", description: "Marks the beginning of the new calendar year. Filipinos celebrate with family reunions, fireworks, and Media Noche — a midnight feast to welcome the year with prosperity and togetherness." },
      { date: "2025-03-28", name: "Eid'l Fitr", type: "regular", description: "The Festival of Breaking the Fast celebrates the end of Ramadan, the Islamic holy month of fasting. Filipino Muslims gather for communal prayers, feasts, and acts of charity." },
      { date: "2025-04-17", name: "Maundy Thursday", type: "regular", description: "Commemorates the Last Supper of Jesus Christ with his apostles. Many Filipinos attend church services, participate in the Visita Iglesia (visiting seven churches), and observe solemn reflection." },
      { date: "2025-04-18", name: "Good Friday", type: "regular", description: "Marks the crucifixion and death of Jesus Christ. It is one of the most solemn days in the Philippines, observed with processions, the Senakulo (passion play), and fasting." },
      { date: "2025-04-09", name: "Araw ng Kagitingan", type: "regular", description: "Day of Valor honoring the heroism of Filipino and American soldiers who fought in the Battle of Bataan during World War II. It commemorates their courage and sacrifice during the fall of Bataan in 1942." },
      { date: "2025-05-01", name: "Labor Day", type: "regular", description: "Celebrates the contributions and achievements of Filipino workers. Labor groups traditionally hold rallies and marches to advocate for workers' rights and better working conditions." },
      { date: "2025-06-06", name: "Eid'l Adha", type: "regular", description: "The Feast of Sacrifice commemorates Prophet Ibrahim's willingness to sacrifice his son in obedience to God. Filipino Muslims celebrate with communal prayers and the sharing of meat with family and the less fortunate." },
      { date: "2025-06-12", name: "Independence Day", type: "regular", description: "Celebrates the declaration of Philippine independence from Spanish colonial rule on June 12, 1898, in Kawit, Cavite. The national flag is raised and the anthem is sung across the country." },
      { date: "2025-08-25", name: "National Heroes Day", type: "regular", description: "Honors all Filipino heroes — known and unknown — who contributed to the country's freedom and nation-building. It is observed on the last Monday of August and commemorates the Cry of Pugad Lawin of 1896." },
      { date: "2025-11-30", name: "Bonifacio Day", type: "regular", description: "Honors Andrés Bonifacio, the Father of the Philippine Revolution, on his birth anniversary. He founded the Katipunan, the secret society that led the revolt against Spanish colonial rule in 1896." },
      { date: "2025-12-25", name: "Christmas Day", type: "regular", description: "Celebrates the birth of Jesus Christ. The Philippines holds the longest Christmas season in the world, beginning in September. Families gather for Noche Buena, exchange gifts, and attend Simbang Gabi masses." },
      { date: "2025-12-30", name: "Rizal Day", type: "regular", description: "Commemorates the martyrdom of Dr. José Rizal, the Philippines' national hero, who was executed by the Spanish colonial government on December 30, 1896. His writings inspired the Philippine Revolution." },

      // ── Special (Non-Working) Days ──
      { date: "2025-01-29", name: "Chinese New Year", type: "special", description: "Celebrates the Lunar New Year, an important cultural occasion for the Filipino-Chinese community. Festivities include dragon dances, family reunions, the giving of ang pao (red envelopes), and festive meals." },
      { date: "2025-02-25", name: "EDSA People Power Anniversary", type: "special", description: "Commemorates the peaceful People Power Revolution of 1986, when millions of Filipinos gathered along EDSA to overthrow the Marcos dictatorship and restore democracy to the Philippines." },
      { date: "2025-04-19", name: "Black Saturday", type: "special", description: "The day between Good Friday and Easter Sunday. Filipinos observe a day of mourning and quiet reflection on the death of Jesus Christ, with many attending evening Easter Vigil services." },
      { date: "2025-08-21", name: "Ninoy Aquino Day", type: "special", description: "Commemorates the assassination of Senator Benigno \"Ninoy\" Aquino Jr. on August 21, 1983, at the Manila International Airport. His death galvanized the opposition to the Marcos dictatorship and sparked the People Power Revolution of 1986." },
      { date: "2025-11-01", name: "All Saints' Day", type: "special", description: "A day to honor all saints and deceased loved ones. Filipino families visit cemeteries to clean and decorate graves, light candles, offer prayers, and spend time together remembering those who have passed." },
      { date: "2025-11-02", name: "All Souls' Day", type: "special", description: "Continues the remembrance of the faithful departed. Filipinos offer prayers and masses for the souls of loved ones, believing that prayers help souls in purgatory find peace." },
      { date: "2025-12-08", name: "Feast of the Immaculate Conception", type: "special", description: "A Catholic holy day celebrating the belief that the Virgin Mary was conceived without original sin. Many Filipinos attend special masses, and the day is part of the Simbang Gabi novena season." },
      { date: "2025-12-24", name: "Christmas Eve", type: "special", description: "The evening before Christmas Day. Filipino families prepare the Noche Buena feast, attend Misa de Gallo (midnight mass), and gather to celebrate the holiday together." },
      { date: "2025-12-31", name: "Last Day of the Year", type: "special", description: "The final day of the year is celebrated with family gatherings, festive meals, fireworks, and noise-making to drive away bad spirits and welcome the New Year with hope and joy." },
    ],
  };

  return holidaysByYear[year] || [];
}

// Quick lookup: returns holidays for a specific date string (YYYY-MM-DD)
export function getHolidaysForDate(year: number, dateStr: string): Holiday[] {
  return getPhilippineHolidays(year).filter(h => h.date === dateStr);
}
