// string regex:
/("(?:[^\r\n"]|\\"|\\\r?\n)*"|'(?:[^\r\n']|\\'|\\\r?\n)*')/;

export const parseString = str => {
  str = str.replace(/\\\r?\n/g, "");
  return JSON.parse(
    str[0] === "'"
      ? `"${str
          .replace(/"/g, '\\"')
          .replace(/\\'/g, "'")
          .slice(1, -2)}"`
      : str
  );
};
