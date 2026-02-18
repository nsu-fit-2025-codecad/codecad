export const SELECTED_MODEL_ATTRIBUTE = 'data-selected-model';
export const SELECTED_MODEL_CLASS = 'selected-model-highlight';

const SELECTED_MODEL_STROKE_COLOR = '#0284c7';
const SELECTED_MODEL_STROKE_WIDTH = '0.6mm';
const SELECTED_MODEL_STYLE = `stroke:${SELECTED_MODEL_STROKE_COLOR};stroke-width:${SELECTED_MODEL_STROKE_WIDTH};`;

export const highlightSelectedModelInSvg = (
  svgString: string,
  selectedModelId: string | null
): string => {
  if (!svgString || !selectedModelId) {
    return svgString;
  }

  const domResult = highlightSelectedModelWithDomParser(
    svgString,
    selectedModelId
  );
  if (domResult !== null) {
    return domResult;
  }

  return highlightSelectedModelWithTagPatch(svgString, selectedModelId);
};

const highlightSelectedModelWithDomParser = (
  svgString: string,
  selectedModelId: string
): string | null => {
  if (
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  ) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const document = parser.parseFromString(svgString, 'image/svg+xml');
    const rootNode = document.documentElement;

    if (!rootNode || rootNode.nodeName.toLowerCase() !== 'svg') {
      return null;
    }

    if (document.getElementsByTagName('parsererror').length > 0) {
      return svgString;
    }

    const selectedElement = findModelGroupElement(document, selectedModelId);
    if (!selectedElement) {
      return svgString;
    }

    applyHighlightAttributes(selectedElement);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(rootNode);
  } catch {
    return null;
  }
};

const highlightSelectedModelWithTagPatch = (
  svgString: string,
  selectedModelId: string
): string => {
  const modelTagMatch = findModelGroupTagMatch(svgString, selectedModelId);
  if (!modelTagMatch) {
    return svgString;
  }

  const startTag = modelTagMatch[0];
  const startTagIndex = modelTagMatch.index;
  const endTagIndex = startTagIndex + startTag.length - 1;

  const existingClassName = readTagAttribute(startTag, 'class');
  const existingStyle = readTagAttribute(startTag, 'style');

  let updatedTag = upsertTagAttribute(
    startTag,
    SELECTED_MODEL_ATTRIBUTE,
    'true'
  );
  updatedTag = upsertTagAttribute(
    updatedTag,
    'class',
    appendClassName(existingClassName, SELECTED_MODEL_CLASS)
  );
  updatedTag = upsertTagAttribute(
    updatedTag,
    'style',
    appendStyleDeclaration(existingStyle, SELECTED_MODEL_STYLE)
  );

  return (
    svgString.slice(0, startTagIndex) +
    updatedTag +
    svgString.slice(endTagIndex + 1)
  );
};

const applyHighlightAttributes = (element: Element): void => {
  const currentClassName = element.getAttribute('class');
  const currentStyle = element.getAttribute('style');

  element.setAttribute(SELECTED_MODEL_ATTRIBUTE, 'true');
  element.setAttribute(
    'class',
    appendClassName(currentClassName, SELECTED_MODEL_CLASS)
  );
  element.setAttribute(
    'style',
    appendStyleDeclaration(currentStyle, SELECTED_MODEL_STYLE)
  );
};

const appendClassName = (
  currentValue: string | null,
  classNameToAppend: string
): string => {
  const classNames = (currentValue ?? '')
    .split(/\s+/)
    .map((name) => name.trim())
    .filter(Boolean);

  if (!classNames.includes(classNameToAppend)) {
    classNames.push(classNameToAppend);
  }

  return classNames.join(' ');
};

const appendStyleDeclaration = (
  currentValue: string | null,
  declaration: string
): string => {
  const currentStyle = (currentValue ?? '').trim();

  if (!currentStyle) {
    return declaration;
  }

  if (currentStyle.includes(declaration)) {
    return currentStyle;
  }

  return currentStyle.endsWith(';')
    ? `${currentStyle}${declaration}`
    : `${currentStyle};${declaration}`;
};

const readTagAttribute = (
  tag: string,
  attributeName: string
): string | null => {
  const pattern = new RegExp(`\\s${attributeName}=(["'])(.*?)\\1`);
  const match = tag.match(pattern);

  return match?.[2] ?? null;
};

const upsertTagAttribute = (
  tag: string,
  attributeName: string,
  attributeValue: string
): string => {
  const escapedValue = escapeAttributeValue(attributeValue);
  const pattern = new RegExp(`\\s${attributeName}=(["'])(.*?)\\1`);

  if (pattern.test(tag)) {
    return tag.replace(pattern, ` ${attributeName}="${escapedValue}"`);
  }

  const insertAt = tag.endsWith('/>') ? tag.length - 2 : tag.length - 1;
  return (
    tag.slice(0, insertAt) +
    ` ${attributeName}="${escapedValue}"` +
    tag.slice(insertAt)
  );
};

const findModelGroupElement = (
  document: Document,
  selectedModelId: string
): Element | null => {
  const modelGroupElements = document.querySelectorAll('g[id]');

  for (const modelGroupElement of modelGroupElements) {
    if (modelGroupElement.getAttribute('id') === selectedModelId) {
      return modelGroupElement;
    }
  }

  return null;
};

const findModelGroupTagMatch = (
  svgString: string,
  selectedModelId: string
): RegExpExecArray | null => {
  const id = escapeRegularExpression(selectedModelId);
  const pattern = new RegExp(`<g\\b[^>]*\\sid=(["'])${id}\\1[^>]*>`, 'i');
  return pattern.exec(svgString);
};

const escapeRegularExpression = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const escapeAttributeValue = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
};
