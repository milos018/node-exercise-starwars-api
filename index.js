const express = require("express");
const axios = require("axios");
const app = express();

//
const STAR_WARS_API = "https://swapi.dev/api";

class HttpErorr extends Error {
  constructor(message, errorCode) {
    super(message);
    this.code = errorCode;
  }
}

/**
 * GET /people
 * @description Get all star wars characters
 * @param req.query.sortBy sortBy query
 */
app.get("/people", async (req, res, next) => {
  const resData = [];
  let { query } = req;

  const allowedQueryValues = ["name", "height", "mass"];

  // Check if valid query keys and values
  if (
    Object.keys(query).length > 0 &&
    (!query["sortBy"] || !allowedQueryValues.includes(query.sortBy))
  ) {
    return next(new HttpErorr("Invalid query", 400));
  }

  const PATH_URL = STAR_WARS_API + "/people";

  try {
    // initial fetch
    const { data: initial } = await axios(PATH_URL);
    resData.push(...initial.results);

    // while .next, keep fetching
    let next = initial.next;
    while (next) {
      const { data } = await axios(next);
      resData.push(...data.results);
      next = data.next;
    }
  } catch (error) {
    next(error);
  }

  // no data found, return 404
  if (!resData.length) {
    return next(HttpErorr("No data found", 404));
  }

  // sort by query
  resData.length > 1 &&
    resData.sort((a, b) => a[query.sortBy] - b[query.sortBy]);

  return res.status(200).json({
    data: resData,
    count: resData.length,
  });
});

/**
 * GET /planets
 * @description Get all star wars planets
 */
app.get("/planets", async (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    return next(new HttpErorr("Invalid query", 400));
  }

  let resData = [];

  const PATH_URL = STAR_WARS_API + "/planets";

  try {
    // initial fetch
    const { data: initial } = await axios(PATH_URL);
    resData.push(...initial.results);

    // while .next, keep fetching
    let next = initial.next;
    while (next) {
      const { data } = await axios(next);
      resData.push(...data.results);
      next = data.next;
    }
  } catch (error) {
    return next(new HttpErorr("Something went wrong", 500));
  }

  // no data found, return 404
  if (!resData.length) {
    return next(new HttpErorr("No planets found", 404));
  }

  try {
    resData = await Promise.all(
      resData.map(async (planet) => {
        planet = { ...planet };
        planet.residents = await Promise.all(
          planet.residents.map(async (resident) => {
            const { data } = await axios(resident);
            resident = data.name;
            return resident;
          })
        );
        return planet;
      })
    );
  } catch (error) {
    return next(new HttpErorr("Something went wrong", 500));
  }

  return res.status(200).json({
    data: resData,
    count: resData.length,
  });
});

// err handling
app.use((err, _, res, __) => {
  if (err instanceof HttpErorr) {
    return res.status(err.code).json({
      error: err.message,
    });
  }

  return res.status(500).json({
    message: "Something went wrong",
  });
});

const PORT = 5593;
app.listen(PORT, () => {
  console.log("listening on ", PORT);
});
