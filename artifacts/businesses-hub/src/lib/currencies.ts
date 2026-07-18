export interface Currency {
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
  symbolPosition: "before" | "after";
  decimals: 0 | 2 | 3 | 6 | 8;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  // ── MENA / GCC Priority ──────────────────────────────────────────────────
  { code: "USD", name: "US Dollar",               nameAr: "دولار أمريكي",          symbol: "$",     symbolPosition: "before", decimals: 2, flag: "🇺🇸" },
  { code: "SAR", name: "Saudi Riyal",             nameAr: "ريال سعودي",            symbol: "ر.س",   symbolPosition: "after",  decimals: 2, flag: "🇸🇦" },
  { code: "AED", name: "UAE Dirham",              nameAr: "درهم إماراتي",          symbol: "د.إ",   symbolPosition: "after",  decimals: 2, flag: "🇦🇪" },
  { code: "KWD", name: "Kuwaiti Dinar",           nameAr: "دينار كويتي",           symbol: "د.ك",   symbolPosition: "after",  decimals: 3, flag: "🇰🇼" },
  { code: "QAR", name: "Qatari Riyal",            nameAr: "ريال قطري",             symbol: "ر.ق",   symbolPosition: "after",  decimals: 2, flag: "🇶🇦" },
  { code: "BHD", name: "Bahraini Dinar",          nameAr: "دينار بحريني",          symbol: "د.ب",   symbolPosition: "after",  decimals: 3, flag: "🇧🇭" },
  { code: "OMR", name: "Omani Rial",              nameAr: "ريال عماني",            symbol: "ر.ع",   symbolPosition: "after",  decimals: 3, flag: "🇴🇲" },
  { code: "EGP", name: "Egyptian Pound",          nameAr: "جنيه مصري",             symbol: "ج.م",   symbolPosition: "after",  decimals: 2, flag: "🇪🇬" },
  { code: "JOD", name: "Jordanian Dinar",         nameAr: "دينار أردني",           symbol: "د.أ",   symbolPosition: "after",  decimals: 3, flag: "🇯🇴" },
  { code: "LYD", name: "Libyan Dinar",            nameAr: "دينار ليبي",            symbol: "ل.د",   symbolPosition: "after",  decimals: 3, flag: "🇱🇾" },
  { code: "IQD", name: "Iraqi Dinar",             nameAr: "دينار عراقي",           symbol: "ع.د",   symbolPosition: "after",  decimals: 3, flag: "🇮🇶" },
  { code: "DZD", name: "Algerian Dinar",          nameAr: "دينار جزائري",          symbol: "د.ج",   symbolPosition: "after",  decimals: 2, flag: "🇩🇿" },
  { code: "MAD", name: "Moroccan Dirham",         nameAr: "درهم مغربي",            symbol: "د.م",   symbolPosition: "after",  decimals: 2, flag: "🇲🇦" },
  { code: "TND", name: "Tunisian Dinar",          nameAr: "دينار تونسي",           symbol: "د.ت",   symbolPosition: "after",  decimals: 3, flag: "🇹🇳" },
  { code: "SYP", name: "Syrian Pound",            nameAr: "ليرة سورية",            symbol: "ل.س",   symbolPosition: "after",  decimals: 2, flag: "🇸🇾" },
  { code: "YER", name: "Yemeni Rial",             nameAr: "ريال يمني",             symbol: "ر.ي",   symbolPosition: "after",  decimals: 2, flag: "🇾🇪" },
  { code: "SDG", name: "Sudanese Pound",          nameAr: "جنيه سوداني",           symbol: "ج.س",   symbolPosition: "after",  decimals: 2, flag: "🇸🇩" },
  { code: "MRU", name: "Mauritanian Ouguiya",     nameAr: "أوقية موريتانية",       symbol: "أ.م",   symbolPosition: "after",  decimals: 2, flag: "🇲🇷" },
  { code: "LBP", name: "Lebanese Pound",          nameAr: "ليرة لبنانية",          symbol: "ل.ل",   symbolPosition: "after",  decimals: 2, flag: "🇱🇧" },
  { code: "PSE", name: "Palestinian Pound",       nameAr: "جنيه فلسطيني",          symbol: "₪",     symbolPosition: "before", decimals: 2, flag: "🇵🇸" },
  { code: "SSP", name: "South Sudanese Pound",    nameAr: "جنيه جنوب السودان",     symbol: "SS£",   symbolPosition: "before", decimals: 2, flag: "🇸🇸" },
  { code: "SOS", name: "Somali Shilling",         nameAr: "شلن صومالي",            symbol: "Sh",    symbolPosition: "before", decimals: 2, flag: "🇸🇴" },
  { code: "ETB", name: "Ethiopian Birr",          nameAr: "بير إثيوبي",            symbol: "Br",    symbolPosition: "before", decimals: 2, flag: "🇪🇹" },
  { code: "DJF", name: "Djiboutian Franc",        nameAr: "فرنك جيبوتي",           symbol: "Fdj",   symbolPosition: "before", decimals: 0, flag: "🇩🇯" },
  { code: "ERN", name: "Eritrean Nakfa",          nameAr: "ناكفا إريترية",         symbol: "Nkf",   symbolPosition: "before", decimals: 2, flag: "🇪🇷" },

  // ── Europe ───────────────────────────────────────────────────────────────
  { code: "EUR", name: "Euro",                    nameAr: "يورو",                  symbol: "€",     symbolPosition: "before", decimals: 2, flag: "🇪🇺" },
  { code: "GBP", name: "British Pound",           nameAr: "جنيه إسترليني",         symbol: "£",     symbolPosition: "before", decimals: 2, flag: "🇬🇧" },
  { code: "CHF", name: "Swiss Franc",             nameAr: "فرنك سويسري",           symbol: "Fr",    symbolPosition: "before", decimals: 2, flag: "🇨🇭" },
  { code: "SEK", name: "Swedish Krona",           nameAr: "كرون سويدي",            symbol: "kr",    symbolPosition: "after",  decimals: 2, flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone",         nameAr: "كرون نرويجي",           symbol: "kr",    symbolPosition: "after",  decimals: 2, flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone",            nameAr: "كرون دنماركي",          symbol: "kr",    symbolPosition: "after",  decimals: 2, flag: "🇩🇰" },
  { code: "PLN", name: "Polish Zloty",            nameAr: "زلوتي بولندي",          symbol: "zł",    symbolPosition: "after",  decimals: 2, flag: "🇵🇱" },
  { code: "CZK", name: "Czech Koruna",            nameAr: "كورونا تشيكية",         symbol: "Kč",    symbolPosition: "after",  decimals: 2, flag: "🇨🇿" },
  { code: "HUF", name: "Hungarian Forint",        nameAr: "فورنت مجري",            symbol: "Ft",    symbolPosition: "after",  decimals: 0, flag: "🇭🇺" },
  { code: "RUB", name: "Russian Ruble",           nameAr: "روبل روسي",             symbol: "₽",     symbolPosition: "after",  decimals: 2, flag: "🇷🇺" },
  { code: "TRY", name: "Turkish Lira",            nameAr: "ليرة تركية",            symbol: "₺",     symbolPosition: "before", decimals: 2, flag: "🇹🇷" },
  { code: "RON", name: "Romanian Leu",            nameAr: "ليو روماني",            symbol: "lei",   symbolPosition: "after",  decimals: 2, flag: "🇷🇴" },
  { code: "BGN", name: "Bulgarian Lev",           nameAr: "ليف بلغاري",            symbol: "лв",    symbolPosition: "after",  decimals: 2, flag: "🇧🇬" },
  { code: "HRK", name: "Croatian Kuna",           nameAr: "كونا كرواتية",          symbol: "kn",    symbolPosition: "after",  decimals: 2, flag: "🇭🇷" },
  { code: "ISK", name: "Icelandic Krona",         nameAr: "كرون آيسلندي",          symbol: "kr",    symbolPosition: "after",  decimals: 0, flag: "🇮🇸" },
  { code: "UAH", name: "Ukrainian Hryvnia",       nameAr: "هريفنيا أوكرانية",      symbol: "₴",     symbolPosition: "before", decimals: 2, flag: "🇺🇦" },
  { code: "BYN", name: "Belarusian Ruble",        nameAr: "روبل بيلاروسي",         symbol: "Br",    symbolPosition: "after",  decimals: 2, flag: "🇧🇾" },
  { code: "RSD", name: "Serbian Dinar",           nameAr: "دينار صربي",            symbol: "din",   symbolPosition: "after",  decimals: 2, flag: "🇷🇸" },
  { code: "BAM", name: "Bosnia-Herzegovina Mark", nameAr: "مارك بوسني هرسكووي",    symbol: "KM",    symbolPosition: "after",  decimals: 2, flag: "🇧🇦" },
  { code: "MKD", name: "Macedonian Denar",        nameAr: "دينار مقدوني",          symbol: "ден",   symbolPosition: "after",  decimals: 2, flag: "🇲🇰" },
  { code: "MDL", name: "Moldovan Leu",            nameAr: "ليو مولدوفي",           symbol: "L",     symbolPosition: "after",  decimals: 2, flag: "🇲🇩" },
  { code: "ALL", name: "Albanian Lek",            nameAr: "ليك ألباني",            symbol: "L",     symbolPosition: "after",  decimals: 2, flag: "🇦🇱" },
  { code: "GIP", name: "Gibraltar Pound",         nameAr: "جنيه جبل طارق",         symbol: "£",     symbolPosition: "before", decimals: 2, flag: "🇬🇮" },
  { code: "IMP", name: "Isle of Man Pound",       nameAr: "جنيه جزيرة مان",        symbol: "£",     symbolPosition: "before", decimals: 2, flag: "🇮🇲" },
  { code: "JEP", name: "Jersey Pound",            nameAr: "جنيه جيرزي",            symbol: "£",     symbolPosition: "before", decimals: 2, flag: "🇯🇪" },
  { code: "GGP", name: "Guernsey Pound",          nameAr: "جنيه غيرنزي",           symbol: "£",     symbolPosition: "before", decimals: 2, flag: "🇬🇬" },

  // ── Americas ─────────────────────────────────────────────────────────────
  { code: "CAD", name: "Canadian Dollar",         nameAr: "دولار كندي",            symbol: "CA$",   symbolPosition: "before", decimals: 2, flag: "🇨🇦" },
  { code: "MXN", name: "Mexican Peso",            nameAr: "بيزو مكسيكي",           symbol: "MX$",   symbolPosition: "before", decimals: 2, flag: "🇲🇽" },
  { code: "BRL", name: "Brazilian Real",          nameAr: "ريال برازيلي",          symbol: "R$",    symbolPosition: "before", decimals: 2, flag: "🇧🇷" },
  { code: "ARS", name: "Argentine Peso",          nameAr: "بيزو أرجنتيني",         symbol: "$",     symbolPosition: "before", decimals: 2, flag: "🇦🇷" },
  { code: "CLP", name: "Chilean Peso",            nameAr: "بيزو تشيلي",            symbol: "$",     symbolPosition: "before", decimals: 0, flag: "🇨🇱" },
  { code: "COP", name: "Colombian Peso",          nameAr: "بيزو كولومبي",          symbol: "$",     symbolPosition: "before", decimals: 0, flag: "🇨🇴" },
  { code: "PEN", name: "Peruvian Sol",            nameAr: "سول بيروفي",            symbol: "S/",    symbolPosition: "before", decimals: 2, flag: "🇵🇪" },
  { code: "UYU", name: "Uruguayan Peso",          nameAr: "بيزو أوروغواياني",      symbol: "$U",    symbolPosition: "before", decimals: 2, flag: "🇺🇾" },
  { code: "VES", name: "Venezuelan Bolívar",      nameAr: "بوليفار فنزويلي",       symbol: "Bs.S",  symbolPosition: "before", decimals: 2, flag: "🇻🇪" },
  { code: "BOB", name: "Bolivian Boliviano",      nameAr: "بوليفيانو بوليفي",      symbol: "Bs",    symbolPosition: "before", decimals: 2, flag: "🇧🇴" },
  { code: "PYG", name: "Paraguayan Guaraní",      nameAr: "غواراني باراغواياني",   symbol: "₲",     symbolPosition: "before", decimals: 0, flag: "🇵🇾" },
  { code: "DOP", name: "Dominican Peso",          nameAr: "بيزو دومينيكاني",       symbol: "RD$",   symbolPosition: "before", decimals: 2, flag: "🇩🇴" },
  { code: "CRC", name: "Costa Rican Colón",       nameAr: "كولون كوستاريكي",       symbol: "₡",     symbolPosition: "before", decimals: 2, flag: "🇨🇷" },
  { code: "GTQ", name: "Guatemalan Quetzal",      nameAr: "كيتزال غواتيمالي",      symbol: "Q",     symbolPosition: "before", decimals: 2, flag: "🇬🇹" },
  { code: "HNL", name: "Honduran Lempira",        nameAr: "لمبيرا هندوراسي",       symbol: "L",     symbolPosition: "before", decimals: 2, flag: "🇭🇳" },
  { code: "NIO", name: "Nicaraguan Córdoba",      nameAr: "كوردوبا نيكاراغوي",     symbol: "C$",    symbolPosition: "before", decimals: 2, flag: "🇳🇮" },
  { code: "PAB", name: "Panamanian Balboa",       nameAr: "بالبوا بنامي",          symbol: "B/.",   symbolPosition: "before", decimals: 2, flag: "🇵🇦" },
  { code: "SVC", name: "Salvadoran Colón",        nameAr: "كولون سلفادوري",        symbol: "₡",     symbolPosition: "before", decimals: 2, flag: "🇸🇻" },
  { code: "JMD", name: "Jamaican Dollar",         nameAr: "دولار جامايكي",         symbol: "J$",    symbolPosition: "before", decimals: 2, flag: "🇯🇲" },
  { code: "TTD", name: "Trinidad Dollar",         nameAr: "دولار ترينيدادي",       symbol: "TT$",   symbolPosition: "before", decimals: 2, flag: "🇹🇹" },
  { code: "BBD", name: "Barbadian Dollar",        nameAr: "دولار بربادوسي",        symbol: "Bds$",  symbolPosition: "before", decimals: 2, flag: "🇧🇧" },
  { code: "HTG", name: "Haitian Gourde",          nameAr: "غورد هايتي",            symbol: "G",     symbolPosition: "before", decimals: 2, flag: "🇭🇹" },
  { code: "CUP", name: "Cuban Peso",              nameAr: "بيزو كوبي",             symbol: "$",     symbolPosition: "before", decimals: 2, flag: "🇨🇺" },
  { code: "CUC", name: "Cuban Convertible Peso",  nameAr: "بيزو كوبي قابل للتحويل", symbol: "CUC$", symbolPosition: "before", decimals: 2, flag: "🇨🇺" },
  { code: "BSD", name: "Bahamian Dollar",         nameAr: "دولار باهامي",          symbol: "B$",    symbolPosition: "before", decimals: 2, flag: "🇧🇸" },
  { code: "BZD", name: "Belize Dollar",           nameAr: "دولار بليزي",           symbol: "BZ$",   symbolPosition: "before", decimals: 2, flag: "🇧🇿" },
  { code: "GYD", name: "Guyanese Dollar",         nameAr: "دولار غياني",           symbol: "G$",    symbolPosition: "before", decimals: 2, flag: "🇬🇾" },
  { code: "SRD", name: "Surinamese Dollar",       nameAr: "دولار سورينامي",        symbol: "Sr$",   symbolPosition: "before", decimals: 2, flag: "🇸🇷" },
  { code: "XCD", name: "East Caribbean Dollar",   nameAr: "دولار كاريبي شرقي",     symbol: "EC$",   symbolPosition: "before", decimals: 2, flag: "🌎" },
  { code: "KYD", name: "Cayman Islands Dollar",   nameAr: "دولار جزر كايمان",      symbol: "CI$",   symbolPosition: "before", decimals: 2, flag: "🇰🇾" },
  { code: "BMD", name: "Bermudian Dollar",        nameAr: "دولار برمودي",          symbol: "BD$",   symbolPosition: "before", decimals: 2, flag: "🇧🇲" },
  { code: "AWG", name: "Aruban Florin",           nameAr: "فلورين أروبي",          symbol: "Afl",   symbolPosition: "before", decimals: 2, flag: "🇦🇼" },
  { code: "ANG", name: "Netherlands Antillean Guilder", nameAr: "غيلدر أنتيل هولندية", symbol: "ƒ", symbolPosition: "before", decimals: 2, flag: "🇨🇼" },
  { code: "FKP", name: "Falkland Islands Pound",  nameAr: "جنيه جزر فوكلاند",      symbol: "£",     symbolPosition: "before", decimals: 2, flag: "🇫🇰" },

  // ── Asia-Pacific ─────────────────────────────────────────────────────────
  { code: "JPY", name: "Japanese Yen",            nameAr: "ين ياباني",             symbol: "¥",     symbolPosition: "before", decimals: 0, flag: "🇯🇵" },
  { code: "CNY", name: "Chinese Yuan",            nameAr: "يوان صيني",             symbol: "¥",     symbolPosition: "before", decimals: 2, flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee",            nameAr: "روبية هندية",           symbol: "₹",     symbolPosition: "before", decimals: 2, flag: "🇮🇳" },
  { code: "HKD", name: "Hong Kong Dollar",        nameAr: "دولار هونج كونج",       symbol: "HK$",   symbolPosition: "before", decimals: 2, flag: "🇭🇰" },
  { code: "SGD", name: "Singapore Dollar",        nameAr: "دولار سنغافوري",        symbol: "S$",    symbolPosition: "before", decimals: 2, flag: "🇸🇬" },
  { code: "AUD", name: "Australian Dollar",       nameAr: "دولار أسترالي",         symbol: "A$",    symbolPosition: "before", decimals: 2, flag: "🇦🇺" },
  { code: "NZD", name: "New Zealand Dollar",      nameAr: "دولار نيوزيلندي",       symbol: "NZ$",   symbolPosition: "before", decimals: 2, flag: "🇳🇿" },
  { code: "PKR", name: "Pakistani Rupee",         nameAr: "روبية باكستانية",       symbol: "₨",     symbolPosition: "before", decimals: 2, flag: "🇵🇰" },
  { code: "BDT", name: "Bangladeshi Taka",        nameAr: "تاكا بنغلاديشية",       symbol: "৳",     symbolPosition: "before", decimals: 2, flag: "🇧🇩" },
  { code: "LKR", name: "Sri Lankan Rupee",        nameAr: "روبية سريلانكية",       symbol: "Rs",    symbolPosition: "before", decimals: 2, flag: "🇱🇰" },
  { code: "NPR", name: "Nepalese Rupee",          nameAr: "روبية نيبالية",         symbol: "Rs",    symbolPosition: "before", decimals: 2, flag: "🇳🇵" },
  { code: "MMK", name: "Myanmar Kyat",            nameAr: "كيات ميانمار",          symbol: "K",     symbolPosition: "before", decimals: 0, flag: "🇲🇲" },
  { code: "THB", name: "Thai Baht",               nameAr: "بات تايلاندي",          symbol: "฿",     symbolPosition: "before", decimals: 2, flag: "🇹🇭" },
  { code: "VND", name: "Vietnamese Dong",         nameAr: "دونج فيتنامي",          symbol: "₫",     symbolPosition: "after",  decimals: 0, flag: "🇻🇳" },
  { code: "IDR", name: "Indonesian Rupiah",       nameAr: "روبية إندونيسية",       symbol: "Rp",    symbolPosition: "before", decimals: 0, flag: "🇮🇩" },
  { code: "MYR", name: "Malaysian Ringgit",       nameAr: "رينجيت ماليزي",         symbol: "RM",    symbolPosition: "before", decimals: 2, flag: "🇲🇾" },
  { code: "PHP", name: "Philippine Peso",         nameAr: "بيزو فلبيني",           symbol: "₱",     symbolPosition: "before", decimals: 2, flag: "🇵🇭" },
  { code: "KRW", name: "South Korean Won",        nameAr: "وون كوري جنوبي",        symbol: "₩",     symbolPosition: "before", decimals: 0, flag: "🇰🇷" },
  { code: "TWD", name: "Taiwan Dollar",           nameAr: "دولار تايواني",         symbol: "NT$",   symbolPosition: "before", decimals: 2, flag: "🇹🇼" },
  { code: "MNT", name: "Mongolian Tugrik",        nameAr: "توغريك منغولي",         symbol: "₮",     symbolPosition: "before", decimals: 2, flag: "🇲🇳" },
  { code: "KHR", name: "Cambodian Riel",          nameAr: "ريال كمبودي",           symbol: "៛",     symbolPosition: "after",  decimals: 0, flag: "🇰🇭" },
  { code: "LAK", name: "Lao Kip",                 nameAr: "كيب لاوسي",             symbol: "₭",     symbolPosition: "after",  decimals: 0, flag: "🇱🇦" },
  { code: "BND", name: "Brunei Dollar",           nameAr: "دولار بروني",           symbol: "B$",    symbolPosition: "before", decimals: 2, flag: "🇧🇳" },
  { code: "MVR", name: "Maldivian Rufiyaa",       nameAr: "روفية مالديفية",        symbol: "Rf",    symbolPosition: "after",  decimals: 2, flag: "🇲🇻" },
  { code: "AFN", name: "Afghan Afghani",          nameAr: "أفغاني أفغاني",         symbol: "؋",     symbolPosition: "after",  decimals: 2, flag: "🇦🇫" },
  { code: "IRR", name: "Iranian Rial",            nameAr: "ريال إيراني",           symbol: "﷼",     symbolPosition: "after",  decimals: 0, flag: "🇮🇷" },
  { code: "AMD", name: "Armenian Dram",           nameAr: "درام أرمني",            symbol: "֏",     symbolPosition: "after",  decimals: 2, flag: "🇦🇲" },
  { code: "AZN", name: "Azerbaijani Manat",       nameAr: "مانات أذربيجاني",       symbol: "₼",     symbolPosition: "before", decimals: 2, flag: "🇦🇿" },
  { code: "GEL", name: "Georgian Lari",           nameAr: "لاري جورجي",            symbol: "₾",     symbolPosition: "before", decimals: 2, flag: "🇬🇪" },
  { code: "KZT", name: "Kazakhstani Tenge",       nameAr: "تينغي كازاخستاني",      symbol: "₸",     symbolPosition: "before", decimals: 2, flag: "🇰🇿" },
  { code: "UZS", name: "Uzbekistani Som",         nameAr: "سوم أوزبكستاني",        symbol: "so'm",  symbolPosition: "after",  decimals: 0, flag: "🇺🇿" },
  { code: "TMT", name: "Turkmenistani Manat",     nameAr: "مانات تركماني",         symbol: "T",     symbolPosition: "before", decimals: 2, flag: "🇹🇲" },
  { code: "TJS", name: "Tajikistani Somoni",      nameAr: "سوموني طاجيكي",         symbol: "SM",    symbolPosition: "after",  decimals: 2, flag: "🇹🇯" },
  { code: "KGS", name: "Kyrgyzstani Som",         nameAr: "سوم قيرغيزستاني",       symbol: "Лв",    symbolPosition: "before", decimals: 2, flag: "🇰🇬" },
  { code: "MOP", name: "Macanese Pataca",         nameAr: "باتاكا ماكاوية",        symbol: "P",     symbolPosition: "before", decimals: 2, flag: "🇲🇴" },
  { code: "BTN", name: "Bhutanese Ngultrum",      nameAr: "نغولتروم بوتاني",       symbol: "Nu",    symbolPosition: "before", decimals: 2, flag: "🇧🇹" },
  { code: "KPW", name: "North Korean Won",        nameAr: "وون كوري شمالي",        symbol: "₩",     symbolPosition: "before", decimals: 0, flag: "🇰🇵" },
  // Pacific Islands
  { code: "PGK", name: "Papua New Guinean Kina",  nameAr: "كينا بابوا غينيا الجديدة", symbol: "K", symbolPosition: "before", decimals: 2, flag: "🇵🇬" },
  { code: "WST", name: "Samoan Tala",             nameAr: "تالا ساموا",            symbol: "T",     symbolPosition: "before", decimals: 2, flag: "🇼🇸" },
  { code: "FJD", name: "Fijian Dollar",           nameAr: "دولار فيجي",            symbol: "FJ$",   symbolPosition: "before", decimals: 2, flag: "🇫🇯" },
  { code: "TOP", name: "Tongan Paʻanga",          nameAr: "باآنغا تونغي",          symbol: "T$",    symbolPosition: "before", decimals: 2, flag: "🇹🇴" },
  { code: "VUV", name: "Vanuatu Vatu",            nameAr: "فاتو فانواتو",          symbol: "VT",    symbolPosition: "before", decimals: 0, flag: "🇻🇺" },
  { code: "SBD", name: "Solomon Islands Dollar",  nameAr: "دولار جزر سليمان",      symbol: "SI$",   symbolPosition: "before", decimals: 2, flag: "🇸🇧" },
  { code: "XPF", name: "CFP Franc",               nameAr: "فرنك المحيط الهادئ",    symbol: "Fr",    symbolPosition: "before", decimals: 0, flag: "🇵🇫" },
  { code: "KID", name: "Kiribati Dollar",         nameAr: "دولار كيريباتي",        symbol: "$",     symbolPosition: "before", decimals: 2, flag: "🇰🇮" },
  { code: "TVD", name: "Tuvaluan Dollar",         nameAr: "دولار توفالو",          symbol: "$",     symbolPosition: "before", decimals: 2, flag: "🇹🇻" },

  // ── Africa ───────────────────────────────────────────────────────────────
  { code: "ZAR", name: "South African Rand",      nameAr: "راند جنوب أفريقي",      symbol: "R",     symbolPosition: "before", decimals: 2, flag: "🇿🇦" },
  { code: "NGN", name: "Nigerian Naira",          nameAr: "نيرة نيجيرية",          symbol: "₦",     symbolPosition: "before", decimals: 2, flag: "🇳🇬" },
  { code: "KES", name: "Kenyan Shilling",         nameAr: "شلن كيني",              symbol: "KSh",   symbolPosition: "before", decimals: 2, flag: "🇰🇪" },
  { code: "GHS", name: "Ghanaian Cedi",           nameAr: "سيدي غاني",             symbol: "GH₵",   symbolPosition: "before", decimals: 2, flag: "🇬🇭" },
  { code: "TZS", name: "Tanzanian Shilling",      nameAr: "شلن تنزاني",            symbol: "TSh",   symbolPosition: "before", decimals: 0, flag: "🇹🇿" },
  { code: "UGX", name: "Ugandan Shilling",        nameAr: "شلن أوغندي",            symbol: "USh",   symbolPosition: "before", decimals: 0, flag: "🇺🇬" },
  { code: "RWF", name: "Rwandan Franc",           nameAr: "فرنك رواندي",           symbol: "FRw",   symbolPosition: "before", decimals: 0, flag: "🇷🇼" },
  { code: "BIF", name: "Burundian Franc",         nameAr: "فرنك بوروندي",          symbol: "Fr",    symbolPosition: "before", decimals: 0, flag: "🇧🇮" },
  { code: "MZN", name: "Mozambican Metical",      nameAr: "متيكال موزمبيقي",       symbol: "MT",    symbolPosition: "before", decimals: 2, flag: "🇲🇿" },
  { code: "ZMW", name: "Zambian Kwacha",          nameAr: "كواتشا زامبية",         symbol: "ZK",    symbolPosition: "before", decimals: 2, flag: "🇿🇲" },
  { code: "MWK", name: "Malawian Kwacha",         nameAr: "كواتشا ملاوية",         symbol: "MK",    symbolPosition: "before", decimals: 2, flag: "🇲🇼" },
  { code: "ZWL", name: "Zimbabwean Dollar",       nameAr: "دولار زيمبابوي",        symbol: "Z$",    symbolPosition: "before", decimals: 2, flag: "🇿🇼" },
  { code: "NAD", name: "Namibian Dollar",         nameAr: "دولار ناميبي",          symbol: "N$",    symbolPosition: "before", decimals: 2, flag: "🇳🇦" },
  { code: "BWP", name: "Botswana Pula",           nameAr: "بولا بوتسواني",         symbol: "P",     symbolPosition: "before", decimals: 2, flag: "🇧🇼" },
  { code: "SZL", name: "Swazi Lilangeni",         nameAr: "ليلانغيني سوازيلاندي",  symbol: "L",     symbolPosition: "before", decimals: 2, flag: "🇸🇿" },
  { code: "LSL", name: "Lesotho Loti",            nameAr: "لوتي ليسوثو",           symbol: "L",     symbolPosition: "before", decimals: 2, flag: "🇱🇸" },
  { code: "AOA", name: "Angolan Kwanza",          nameAr: "كوانزا أنغولي",         symbol: "Kz",    symbolPosition: "before", decimals: 2, flag: "🇦🇴" },
  { code: "XOF", name: "West African CFA",        nameAr: "فرنك أفريقي غربي",      symbol: "CFA",   symbolPosition: "before", decimals: 0, flag: "🌍" },
  { code: "XAF", name: "Central African CFA",     nameAr: "فرنك أفريقي وسطي",      symbol: "FCFA",  symbolPosition: "before", decimals: 0, flag: "🌍" },
  { code: "CDF", name: "Congolese Franc",         nameAr: "فرنك كونغولي",          symbol: "Fr",    symbolPosition: "before", decimals: 2, flag: "🇨🇩" },
  { code: "GNF", name: "Guinean Franc",           nameAr: "فرنك غيني",             symbol: "Fr",    symbolPosition: "before", decimals: 0, flag: "🇬🇳" },
  { code: "MGA", name: "Malagasy Ariary",         nameAr: "آرياري مدغشقري",        symbol: "Ar",    symbolPosition: "before", decimals: 0, flag: "🇲🇬" },
  { code: "MUR", name: "Mauritian Rupee",         nameAr: "روبية موريشيوسية",      symbol: "Rs",    symbolPosition: "before", decimals: 2, flag: "🇲🇺" },
  { code: "SCR", name: "Seychellois Rupee",       nameAr: "روبية سيشلية",          symbol: "Sr",    symbolPosition: "before", decimals: 2, flag: "🇸🇨" },
  { code: "CVE", name: "Cape Verdean Escudo",     nameAr: "إسكودو كابو فيردي",     symbol: "Esc",   symbolPosition: "after",  decimals: 2, flag: "🇨🇻" },
  { code: "STN", name: "São Tomé Dobra",          nameAr: "دوبرا ساو تومي",        symbol: "Db",    symbolPosition: "before", decimals: 2, flag: "🇸🇹" },
  { code: "GMD", name: "Gambian Dalasi",          nameAr: "دلاسي غامبي",           symbol: "D",     symbolPosition: "before", decimals: 2, flag: "🇬🇲" },
  { code: "SLE", name: "Sierra Leonean Leone",    nameAr: "ليون سيراليون",         symbol: "Le",    symbolPosition: "before", decimals: 2, flag: "🇸🇱" },
  { code: "LRD", name: "Liberian Dollar",         nameAr: "دولار ليبيري",          symbol: "L$",    symbolPosition: "before", decimals: 2, flag: "🇱🇷" },
  { code: "KMF", name: "Comorian Franc",          nameAr: "فرنك جزر القمر",        symbol: "Fr",    symbolPosition: "before", decimals: 0, flag: "🇰🇲" },
  { code: "SHP", name: "Saint Helena Pound",      nameAr: "جنيه سانت هيلينا",      symbol: "£",     symbolPosition: "before", decimals: 2, flag: "🇸🇭" },
  { code: "XDR", name: "IMF Special Drawing Rights", nameAr: "حقوق السحب الخاصة", symbol: "SDR",   symbolPosition: "before", decimals: 2, flag: "🌐" },

  // ── Additional Fiat ───────────────────────────────────────────────────────
  { code: "ZWG", name: "Zimbabwe Gold",            nameAr: "الذهب الزيمبابوي",      symbol: "ZiG",   symbolPosition: "before", decimals: 2, flag: "🇿🇼" },
  { code: "SLL", name: "Sierra Leone Leone (old)", nameAr: "ليون سيراليون (قديم)",  symbol: "Le",    symbolPosition: "before", decimals: 0, flag: "🇸🇱" },
  { code: "VEF", name: "Venezuelan Bolívar Fuerte",nameAr: "بوليفار فنزويلي قوي",   symbol: "Bs.F",  symbolPosition: "before", decimals: 2, flag: "🇻🇪" },
  { code: "CLF", name: "Chilean Unidad de Fomento",nameAr: "وحدة تحييد تشيلية",     symbol: "UF",    symbolPosition: "before", decimals: 0, flag: "🇨🇱" },
  { code: "MXV", name: "Mexican Investment Unit",  nameAr: "وحدة استثمارية مكسيكية", symbol: "UDI",  symbolPosition: "before", decimals: 2, flag: "🇲🇽" },
  { code: "COU", name: "Colombian Real Value Unit",nameAr: "وحدة قيمة حقيقية كولومبية", symbol: "UVR", symbolPosition: "before", decimals: 2, flag: "🇨🇴" },
  { code: "UYI", name: "Uruguayan Peso Unidades Indexadas", nameAr: "بيزو أوروغواياني مُفهرس", symbol: "UI", symbolPosition: "before", decimals: 0, flag: "🇺🇾" },

  // ── Crypto (widely used in MENA invoicing) ────────────────────────────────
  { code: "BTC", name: "Bitcoin",                  nameAr: "بيتكوين",               symbol: "₿",     symbolPosition: "before", decimals: 8, flag: "🟡" },
  { code: "ETH", name: "Ethereum",                 nameAr: "إيثيريوم",              symbol: "Ξ",     symbolPosition: "before", decimals: 8, flag: "🔷" },
  { code: "USDT", name: "Tether USD",              nameAr: "تيثر دولار",            symbol: "₮",     symbolPosition: "before", decimals: 2, flag: "🟢" },
  { code: "USDC", name: "USD Coin",                nameAr: "عملة يو إس دي سي",     symbol: "USDC",  symbolPosition: "before", decimals: 2, flag: "🔵" },
  { code: "XRP",  name: "Ripple XRP",              nameAr: "ريبل إكس آر بي",       symbol: "XRP",   symbolPosition: "before", decimals: 6, flag: "⚫" },
  { code: "BNB",  name: "Binance Coin",            nameAr: "عملة بينانس",           symbol: "BNB",   symbolPosition: "before", decimals: 8, flag: "🟠" },
];

// Remove duplicates by code — keep first occurrence
const seen = new Set<string>();
export const ALL_CURRENCIES: Currency[] = CURRENCIES.filter(c => {
  if (seen.has(c.code)) return false;
  seen.add(c.code);
  return true;
});

export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "EGP", "JOD"];

export function getCurrencyByCode(code: string): Currency | undefined {
  return ALL_CURRENCIES.find(c => c.code === code);
}

export function formatAmount(amount: number, currency: Currency): string {
  const num = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(amount);
  return currency.symbolPosition === "before"
    ? `${currency.symbol} ${num}`
    : `${num} ${currency.symbol}`;
}

export function getCurrencySymbol(code: string): string {
  return getCurrencyByCode(code)?.symbol ?? code;
}

// Backward compat
export const CURRENCIES_LIST = ALL_CURRENCIES.map(c => ({ code: c.code, symbol: c.symbol, name: c.name }));
