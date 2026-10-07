/**
 * Storage layer: reads and writes the JSON data file.
 *
 * This is the only module that touches the file system. The rest of the
 * application works with plain arrays of expense objects, so swapping the
 * JSON file for a database later would only change this file.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Raised for an unreadable or corrupt data file. Returning an empty list in
 * that case would let the next write overwrite the file and destroy every
 * stored expense, so the error is surfaced instead.
 */
class DataFileError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataFileError";
    this.statusCode = 500;
  }
}

/**
 * Creates a store bound to one data file.
 * @param {string} dataFile absolute path to the JSON file
 */
function createExpenseStore(dataFile) {
  const fileName = path.basename(dataFile);

  /** Creates the data directory and an empty store if they do not exist. */
  function ensureDataFile() {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, "[]\n", "utf-8");
    }
  }

  /**
   * Reads every expense from disk.
   * @returns {Array<Object>} the stored expenses (empty if the file is absent)
   * @throws {DataFileError} if the file cannot be parsed or is not an array
   */
  function readAll() {
    let raw;
    try {
      raw = fs.readFileSync(dataFile, "utf-8");
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw new DataFileError(`Cannot read the data file: ${err.message}`);
    }

    if (raw.trim() === "") return [];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new DataFileError(
        `The data file ${fileName} contains invalid JSON (${err.message}). ` +
          "It was left untouched. Please repair or restore it.",
      );
    }

    if (!Array.isArray(parsed)) {
      throw new DataFileError(
        `The data file ${fileName} must contain a JSON array. ` +
          "It was left untouched. Please repair or restore it.",
      );
    }

    return parsed.filter((entry) => entry !== null && typeof entry === "object");
  }

  /**
   * Persists expenses atomically: writes a temporary file in the same folder
   * and renames it over the target, so a crash mid-write leaves the previous
   * version intact rather than a truncated file.
   * @param {Array<Object>} expenses
   */
  function writeAll(expenses) {
    ensureDataFile();
    const tmpFile = `${dataFile}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(tmpFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf-8");
      fs.renameSync(tmpFile, dataFile);
    } catch (err) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        /* the temp file may not exist; nothing more to do */
      }
      throw new DataFileError(`Could not save the data file: ${err.message}`);
    }
  }

  return { ensureDataFile, readAll, writeAll, dataFile };
}

module.exports = { createExpenseStore, DataFileError };
