const fs = require("fs");

/**
 * @param {object} el
 * @returns {boolean}
 */
const isParsable = (el) =>
  ["number", "string", "boolean", "object"].includes(typeof el);

/**
 * @param {object} object
 * @returns {string}
 */
const encode = (object, depth = 0) => {
  if (object === null) {
    return "null";
  } else if (typeof object === "number" || typeof object === "boolean") {
    return object;
  } else if (typeof object === "string") {
    return `"${object}"`;
  } else if (typeof object !== "object") {
    return "";
  }

  let text = "";

  if (Array.isArray(object)) {
    if (object.length === 0) return "[]";

    text += "[";

    for (let i = 0; i < object.length; i++) {
      if (object[i] === undefined) continue;
      if (i !== 0) text += ",";
      text += encode(object[i], depth++);
    }

    text += "]";
  } else {
    const entries = Object.entries(object);
    if (entries.length === 0) return "{}";

    text += "{";

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      if (value === undefined) continue;
      if (!isParsable(value)) continue;
      if (i !== 0) text += ",";

      text += `"${key}":` + encode(value);
    }

    text += "}";
  }

  return text;
};

const getFieldName = (text) => {
  let content = "";
  let isInsideQuote = false;

  text = myTrimStart(text);

  if (text.startsWith(`distinct":true,"url":"https://api.github`)) {
    console.log("lol");
  }

  let i = 0;
  for (; i < text.length; i++) {
    if (content === "distinct:true,") {
      console.log("here lol");
    }
    const letter = text[i];
    if (letter === '"' && !isInsideQuote) {
      isInsideQuote = true;
      if (/[0-9]/.test(text[i + 1])) {
        throw new Error("field name must start with a letter");
      }
      continue;
    } else if (letter === '"' && isInsideQuote) {
      return {
        field: content,
        json: text.slice(i + 1).trimStart(),
      };
    }

    content += letter;
  }

  throw new Error(`cannot parse field name at position: ${i - 1}`);
};

const getStringContent = (text) => {
  let isInsideQuote = false;
  let content = "";
  for (let i = 0; i < text.length; i++) {
    const letter = text[i];
    if (letter === "\\" && isInsideQuote) {
      i += 1;
      content += text[content.length + 1];
      continue;
    }
    if (letter === '"' && !isInsideQuote) {
      isInsideQuote = !isInsideQuote;
      continue;
    } else if (letter === '"' && isInsideQuote) {
      return {
        content: content,
        json: myTrimStart(text.slice(i + 1)),
      };
    }

    content += letter;
  }

  throw new Error("there is no close quote");
};

const myTrimStart = (t) => t.trimStart().replace(/^[, ]/, "").trimStart();

const getNumberContent = (text) => {
  let content = "";
  for (let i = 0; i < text.length; i++) {
    const element = text[i];

    if (!/[0-9]|\./.test(element)) {
      const n = Number(content);

      if (Number.isNaN(n)) throw new Error("number wrong :D");

      return {
        number: n,
        json: myTrimStart(text.slice(i)),
      };
    }

    content += element;
  }

  throw new Error("number wrong :(");
};

const _decodeFn = (json) => {
  json = myTrimStart(json);
  let object;

  if (json[0] === "{") {
    object = {};

    json = myTrimStart(json.slice(1));

    while (json.length > 0) {
      json = myTrimStart(json);
      if (json[0] === "}") return { result: object, json: json.slice(1) };

      const fieldNameResult = getFieldName(json);
      json = fieldNameResult.json;
      if (json[0] !== ":") {
        throw new Error("json malformed");
      }
      json = json.slice(1);

      const decodeResult = _decodeFn(json);
      object[fieldNameResult.field] = decodeResult.result;
      json = decodeResult.json;

      if (json[0] === "}") return { result: object, json: json.slice(1) };
    }
  } else if (json[0] === "[") {
    object = [];
    json = myTrimStart(json.slice(1));
    
    while (json.length > 0) {
      json = myTrimStart(json);
      if (json[0] === "]") return { result: object, json: json.slice(1) };
      if(json.length < 20){
        console.log("para aqui poh");
      }
      

      const decodeResult = _decodeFn(json);
      json = decodeResult.json;
      object.push(decodeResult.result);

      if (json[0] === "]") return { result: object, json: json.slice(1) };
    }
  } else if (json.startsWith("null")) {
    return { result: null, json: json.slice(4) };
  } else if (json.startsWith("true")) {
    return { result: true, json: json.slice(4) };
  } else if (json.startsWith("false")) {
    return { result: false, json: json.slice(5) };
  } else if (json.startsWith('"')) {
    const stringContent = getStringContent(json);

    return { result: stringContent.content, json: stringContent.json };
  } else if (json[0] && /[0-9]/.test(json[0])) {
    const numberContent = getNumberContent(json);

    return { result: numberContent.number, json: numberContent.json };
  }

  throw new Error("cannot parse json huggy, womp womp");
};

const decode = (json) => {
  json = json.trim();

  if (json.length === 0) throw new Error("there is no content");

  if (((json[0] !== "{") ^ (json[0] !== "[")) !== 1) {
    throw new Error("json must start with either { or ]");
  }

  return _decodeFn(json).result;
};

const testObject = {
  value: "1234",
  outroCampo: "45342",
  aqui: true,
  campoWithObject: {
    value: 3231,
    another: undefined,
    oneNull: null,
    arr: [1, 2, 3, { value: 42 }],
  },
  func: () => {},
};
console.log(encode(testObject));
const result = decode(
  '{"field":42,"anotherOne":{"inside": "42", "anotherinside": null}, "after":"fsdfds", "array": [1,2,3]}'
);
console.log(encode(decode(encode(result))));
const jsonFromInternet = decode(
  `{"id":"2489651045","type":"CreateEvent","actor":{"id":665991,"login":"petroav","gravatar_id":"","url":"https://api.github.com/users/petroav","avatar_url":"https://avatars.githubusercontent.com/u/665991?"},"repo":{"id":28688495,"name":"petroav/6.828","url":"https://api.github.com/repos/petroav/6.828"},"payload":{"ref":"master","ref_type":"branch","master_branch":"master","description":"Solution to homework and assignments from MIT's 6.828 (Operating Systems Engineering). Done in my spare time.","pusher_type":"user"},"public":true,"created_at":"2015-01-01T15:00:00Z"}`
);
console.log(encode(jsonFromInternet));

(() => {
  const file = fs.readFileSync("./large-file.json").toString();

  console.log("\n\n");

  console.time("$js-default-parser");
  const _jsEncodeResult = JSON.parse(file);
  console.timeEnd("$js-default-parser");

  console.time("$my-parser");
  const _myEncodeResult = decode(file);
  console.timeEnd("$my-parser");

  console.log("\n\n");
  
  
  console.time("$js-default-encoder");
  const _jsEncoderResult = JSON.stringify(_jsEncodeResult);
  console.timeEnd("$js-default-encoder");

  console.time("$my-encoder");
  const _myEncoderResult = encode(_jsEncodeResult);
  console.timeEnd("$my-encoder");
})();