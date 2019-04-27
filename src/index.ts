import { createReadStream } from "fs";
import { createInterface } from "readline";

/**
 * Indicator
 */
class Indicator {
  country: string;
  countryCode: string;
  name: string;
  code: string;
  values: { [key: number]: string };

  constructor() {
    this.values = [];
  }
}

/**
 * Report
 */
class Report {
  years: string[];
  indicators: Indicator[];

  constructor() {
    this.years = [];
    this.indicators = [];
  }

  /**
   * Read data file from given path
   * @param filePath
   */
  async readDataFile(filePath: string): Promise<Report> {
    return new Promise((resolve, reject) => {
      const instream = createReadStream(filePath);
      const rl = createInterface(instream);
      let gotHeader = false;
      // read line by line
      rl.on("line", (input: string) => {
        const cols = this.parseLine(input, '","');
        // check for header
        if (!cols || cols.length == 0 || !gotHeader) {
          if (cols[0] === "Country Name") {
            gotHeader = true;
            this.years.push(...cols.slice(4));
          }
          return;
        }

        if (cols.length < this.years.length + 4) {
          console.log("ignored invalid line : ", input);
          return;
        }
        // start reading data in
        const indicator = new Indicator();
        indicator.country = cols[0];
        indicator.countryCode = cols[1];
        indicator.name = cols[2];
        indicator.code = cols[3];
        let index = 4;
        this.years.forEach(year => {
          indicator.values[parseInt(year)] = cols[index];
          index++;
        });
        this.addIndicator(indicator);
      });
      // reached the EOF
      rl.on("close", () => {
        resolve(this);
      });

      rl.on("SIGINT", () => {
        reject("interrupted");
      });

      rl.on("SIGTSTP", () => {
        reject("stopped");
      });
    });
  }

  /**
   * Parse a line of csv
   * @param line
   * @param sep
   */
  parseLine(line: string, sep: string): string[] {
    line = line.substr(line.indexOf('"') + 1, line.lastIndexOf('"') - 1);
    return line.split(sep);
  }

  /**
   * Add an indicator into report
   * @param indicator
   */
  addIndicator(indicator: Indicator): void {
    if (indicator) this.indicators.push(indicator);
  }

  /**
   * Sort indicators by either name or code
   * @param sortField
   */
  sortBy(sortField: string): void {
    switch (sortField) {
      case "name":
        this.indicators.sort((a: Indicator, b: Indicator) => {
          return a.name.localeCompare(b.name);
        });
        break;
      case "code":
        this.indicators.sort((a: Indicator, b: Indicator) => {
          return a.code.localeCompare(b.code);
        });
        break;
    }
  }

  /**
   * Find the country with the highest average value of given indicator name between give years ( inclusive )
   * @param indicatorName
   * @param startYear
   * @param endYear
   */
  countryOfHighestAverageBewteenYears(
    indicatorName: string,
    startYear: number,
    endYear: number
  ): string {
    return this.indicators
      .filter((value: Indicator) => {
        return value.name === indicatorName;
      })
      .reduce((previous: Indicator, current: Indicator): Indicator => {
        if (!previous) return current;
        if (!current) return previous;
        let currentTotal: number = 0,
          previousTotal: number = 0;
        for (var i = startYear; i <= endYear; i++) {
          if (current.values[i] === "") {
            // do not consider the country with interrupted data dudring those years
            return previous;
          } else {
            currentTotal += parseFloat(current.values[i]);
          }
        }
        for (var i = startYear; i <= endYear; i++) {
          if (previous.values[i] === "") {
            // do not consider the country with interrupted data dudring those years
            return current;
          } else {
            previousTotal += parseFloat(previous.values[i]);
          }
        }

        if (currentTotal >= previousTotal) {
          return current;
        } else {
          return previous;
        }
      }, null).country;
  }

  /**
   * Find the year with the highest value of given indicator name averaged across each country
   * @param indicatorName
   */
  yearOfHighestAmongAllCountries(indicatorName: string): string {
    const averagies: {
      [key: string]: { total: number; count: number; avg: number };
    } = {};
    this.indicators
      .filter((value: Indicator) => {
        return value.name === indicatorName;
      })
      .forEach((indicator: Indicator) => {
        Object.keys(indicator.values).forEach((year: string) => {
          if (!averagies[year])
            averagies[year] = { total: 0, count: 0, avg: 0 };
          if (indicator.values[year] === "") {
            return;
          }

          averagies[year].total += parseFloat(indicator.values[year]);
          averagies[year].count++;

          if (averagies[year].count != 0) {
            averagies[year].avg = averagies[year].total / averagies[year].count;
          }
        });
      });

    return Object.keys(averagies).reduce(
      (previous: string, current: string): string => {
        if (!previous) return current;
        if (!current) return previous;
        if (averagies[current].avg >= averagies[previous].avg) {
          return current;
        } else {
          return previous;
        }
      }
    );
  }
}

(() => {
  if (process.argv.length < 3) {
    console.log("Usage : ts-node index.ts <data file path>");
    console.log("Example : ts-node src/index.ts data.csv");
    process.exit(1);
  }

  // Run report with provided data file path
  const report = new Report();
  report.readDataFile(process.argv[2]).then(report => {
    // question 2a
    report.sortBy("code");
    const name = "Urban population growth (annual %)";
    const yearStart = 1980,
      yearEnd = 1990;
    const result = report.countryOfHighestAverageBewteenYears(
      name,
      yearStart,
      yearEnd
    );
    console.log(
      `The country with the highest average ${name} between ${yearStart} and ${yearEnd} : ${result}`
    );

    // question 2b
    const name2 = "CO2 emissions (kt)";
    const result2 = report.yearOfHighestAmongAllCountries(name2);
    console.log(`The year with the highest averaged ${name2} : ${result2}`);
  });
})();
