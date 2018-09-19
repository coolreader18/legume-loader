// string regex:
/("(?:[^\r\n"]|\\")*"|'(?:[^\r\n']|\\')*")/;

export const parseString = str =>
  JSON.parse(
    str[0] === "'"
      ? `"${str
          .replace(/"/g, '\\"')
          .replace(/\\'/g, "'")
          .slice(1, -2)}"`
      : str
  );
