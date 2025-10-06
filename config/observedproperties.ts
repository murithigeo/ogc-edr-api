import type { ObservedProperty } from "coveragejson";

export default {
  windSpeed: {
    description: {
      en: "Wind speed rate in m/s",
    },
    label: {
      en: "Wind Speed",
    },
    id: "https://codes.wmo.int/grib2/codeflag/4.2/_3-1-19",
  },
  windDirection: {
    description: {
      en: "Wind direction in angular degrees",
    },
    label: {
      en: "Wind Direction",
    },
    id: "http://codes.wmo.int/grib2/codeflag/4.2/10-0-4",
  },
  temperature: {
    description: {
      en: "temperature in Kelvin/Celsius",
    },
    label: {
      en: "Air temperature",
    },
    id: "https://codes.wmo.int/grib2/codeflag/4.2/_0-0-0",
  },
  dewPointTemperature: {
    label: {
      en: "Dew Point Temperature",
    },
    description: {
      en: "Dew Point Temperature in Kelvin",
    },
    id: "http://codes.wmo.int/grib2/codeflag/4.2/0-0-6",
  },
  pressure: {
    label: {
      en: "Atmospheric pressure",
    },
    description: {
      en: "Atmospheric pressure (Corrected to Mean Sea Level if the Station's elevation is not 0)",
    },
  },
  windType: {
    label: {
      en: "Wind Type",
    },
    description: {
      en: "The type of wind observation A = Abridged Beaufort B = Beaufort C = Calm H = 5-Minute Average Speed N = Normal R = 60-Minute Average Speed Q = Squall T = 180 Minute Average Speed V = Variable\n",
    },
  },
  cloudBase: {
    label: {
      en: "Cloud Base",
    },
    description: {
      en: "Height of base of the cloud",
    },
    id: "https://codes.wmo.int/grib2/codeflag/4.2/_0-6-11",
  },
} satisfies { [x: string]: ObservedProperty };
