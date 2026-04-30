import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface CityRecord {
  cityId: string;
  cityName: string;
  cityNameEn: string;
  prefectureName: string;
  provinceName: string;
  cityType: string;
}

export interface CityLookupResult {
  cityId: string;
  cityName: string;
  prefectureName: string;
  provinceName: string;
}

const dataRoot = fileURLToPath(new URL("../../../../../data", import.meta.url));
const cityKbPath = join(dataRoot, "city-ids.tsv");

let cityRecordsCache: CityRecord[] | null = null;

const normalizeCityAlias = (value: string) =>
  value
    .trim()
    .replace(/(市|区|县|自治县|特别行政区)$/u, "")
    .toLowerCase();

const compactCityAlias = (value: string) =>
  value
    .trim()
    .replace(/[市区县]/gu, "")
    .toLowerCase();

const parseCityRecords = () => {
  if (!existsSync(cityKbPath)) {
    return [];
  }

  const [headerLine, ...rows] = readFileSync(cityKbPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = headerLine.split("\t");
  const indexOf = (name: string) => headers.indexOf(name);

  const indexes = {
    cityId: indexOf("城市id"),
    cityName: indexOf("城市名称"),
    cityNameEn: indexOf("城市名称英文"),
    prefectureName: indexOf("市级名称"),
    provinceName: indexOf("省级名称"),
    cityType: indexOf("cityType")
  };

  if (Object.values(indexes).some((index) => index < 0)) {
    return [];
  }

  return rows.flatMap((row) => {
    const columns = row.split("\t");
    const cityId = columns[indexes.cityId]?.trim();
    const cityName = columns[indexes.cityName]?.trim();

    if (!cityId || !cityName) {
      return [];
    }

    return [
      {
        cityId,
        cityName,
        cityNameEn: columns[indexes.cityNameEn]?.trim() ?? "",
        prefectureName: columns[indexes.prefectureName]?.trim() ?? cityName,
        provinceName: columns[indexes.provinceName]?.trim() ?? "",
        cityType: columns[indexes.cityType]?.trim() ?? ""
      }
    ];
  });
};

const listCityRecords = () => {
  cityRecordsCache ??= parseCityRecords();
  return cityRecordsCache;
};

const aliasesForCity = (record: CityRecord) =>
  [
    record.cityName,
    record.prefectureName,
    record.cityNameEn,
    normalizeCityAlias(record.cityName),
    normalizeCityAlias(record.prefectureName),
    compactCityAlias(record.cityName),
    compactCityAlias(record.prefectureName)
  ].filter((alias, index, aliases) => alias && aliases.indexOf(alias) === index);

export const lookupWeatherCity = (question: string): CityLookupResult | null => {
  const normalizedQuestion = question.toLowerCase();
  const matches = listCityRecords()
    .map((record) => {
      const aliases = aliasesForCity(record);
      const matchedAlias = aliases
        .filter((alias) => normalizedQuestion.includes(alias.toLowerCase()))
        .sort((a, b) => b.length - a.length)[0];

      return matchedAlias ? { record, matchedAlias } : null;
    })
    .filter((match): match is { record: CityRecord; matchedAlias: string } => Boolean(match))
    .sort((a, b) => {
      const cityTypeScore = Number(a.record.cityType === "0") - Number(b.record.cityType === "0");

      if (cityTypeScore !== 0) {
        return -cityTypeScore;
      }

      return b.matchedAlias.length - a.matchedAlias.length;
    });

  const match = matches[0]?.record;

  if (!match) {
    return null;
  }

  return {
    cityId: match.cityId,
    cityName: match.cityName,
    prefectureName: match.prefectureName,
    provinceName: match.provinceName
  };
};
