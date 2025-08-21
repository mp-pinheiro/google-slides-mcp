import { slides_v1 } from 'googleapis';

/**
 * Standard Google Slides dimensions in points.
 */
export const SLIDE_DIMENSIONS = {
  WIDTH: 720, // 10 inches
  HEIGHT: 540, // 7.5 inches
} as const;

/**
 * Standard layout dimensions for title and body slides.
 */
export const LAYOUT_DIMENSIONS = {
  TITLE: {
    x: 50,
    y: 50,
    width: 620,
    height: 80,
  },
  BODY: {
    x: 50,
    y: 150,
    width: 620,
    height: 340,
  },
  FULL_SLIDE: {
    x: 50,
    y: 50,
    width: 620,
    height: 440,
  },
} as const;

/**
 * Font size ranges for different content types.
 */
export const FONT_SIZE_RANGES = {
  TITLE: { min: 24, max: 44, default: 36 },
  BODY: { min: 12, max: 24, default: 18 },
  LIST: { min: 12, max: 20, default: 16 },
  TABLE: { min: 10, max: 16, default: 12 },
} as const;

/**
 * Estimates text dimensions based on font size and content.
 * This is a rough approximation - actual text rendering may vary.
 */
export const estimateTextDimensions = (text: string, fontSize: number): { width: number; height: number } => {
  // Average character width is roughly 0.6 times the font size for most fonts
  const avgCharWidth = fontSize * 0.6;
  const lineHeight = fontSize * 1.2; // Standard line height

  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map((line) => line.length));

  return {
    width: maxLineLength * avgCharWidth,
    height: lines.length * lineHeight,
  };
};

/**
 * Calculates the optimal font size for text to fit within given dimensions.
 */
export const calculateOptimalFontSize = (
  text: string,
  containerWidth: number,
  containerHeight: number,
  fontSizeRange: { min: number; max: number; default: number }
): number => {
  let optimalSize = fontSizeRange.default;

  // Start with default and adjust downward if needed
  for (let fontSize = fontSizeRange.default; fontSize >= fontSizeRange.min; fontSize -= 2) {
    const dimensions = estimateTextDimensions(text, fontSize);

    if (dimensions.width <= containerWidth && dimensions.height <= containerHeight) {
      optimalSize = fontSize;
      break;
    }
  }

  // If still too small, try going up from default
  if (optimalSize === fontSizeRange.default) {
    for (let fontSize = fontSizeRange.default + 2; fontSize <= fontSizeRange.max; fontSize += 2) {
      const dimensions = estimateTextDimensions(text, fontSize);

      if (dimensions.width > containerWidth || dimensions.height > containerHeight) {
        break;
      }
      optimalSize = fontSize;
    }
  }

  return optimalSize;
};

/**
 * Generates transform properties for positioning elements on slides.
 */
export const createTransform = (
  x: number,
  y: number,
  scaleX: number = 1,
  scaleY: number = 1
): slides_v1.Schema$AffineTransform => ({
  scaleX,
  scaleY,
  translateX: x,
  translateY: y,
  unit: 'PT',
});

/**
 * Generates size properties for elements.
 */
export const createSize = (width: number, height: number): slides_v1.Schema$Size => ({
  width: { magnitude: width, unit: 'PT' },
  height: { magnitude: height, unit: 'PT' },
});

/**
 * Creates element properties for positioning and sizing shapes on slides.
 */
export const createElementProperties = (
  pageObjectId: string,
  x: number,
  y: number,
  width: number,
  height: number
): slides_v1.Schema$PageElementProperties => ({
  pageObjectId,
  size: createSize(width, height),
  transform: createTransform(x, y),
});

/**
 * Generates a unique object ID for slide elements.
 */
export const generateObjectId = (prefix: string = 'obj'): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Truncates text to fit within specified character limits while preserving word boundaries.
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
};

/**
 * Splits long text into multiple slides if it exceeds reasonable limits.
 */
export const splitTextForSlides = (text: string, maxCharsPerSlide: number = 800): string[] => {
  if (text.length <= maxCharsPerSlide) return [text];

  const slides: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentSlide = '';

  for (const paragraph of paragraphs) {
    if (currentSlide.length + paragraph.length + 2 <= maxCharsPerSlide) {
      currentSlide += (currentSlide ? '\n\n' : '') + paragraph;
    } else {
      if (currentSlide) {
        slides.push(currentSlide);
        currentSlide = '';
      }

      // If single paragraph is too long, split it further
      if (paragraph.length > maxCharsPerSlide) {
        const sentences = paragraph.split('. ');
        for (let sentence of sentences) {
          if (currentSlide.length + sentence.length + 2 <= maxCharsPerSlide) {
            currentSlide += (currentSlide ? '. ' : '') + sentence;
          } else {
            if (currentSlide) {
              slides.push(currentSlide + (currentSlide.endsWith('.') ? '' : '.'));
              currentSlide = '';
            }

            // If even a single sentence is too long, split by chunks
            if (sentence.length > maxCharsPerSlide) {
              while (sentence.length > maxCharsPerSlide) {
                const chunk = sentence.substring(0, maxCharsPerSlide - 3) + '...';
                slides.push(chunk);
                sentence = sentence.substring(maxCharsPerSlide - 3);
              }
              if (sentence.length > 0) {
                currentSlide = sentence;
              }
            } else {
              currentSlide = sentence;
            }
          }
        }
      } else {
        currentSlide = paragraph;
      }
    }
  }

  if (currentSlide) {
    slides.push(currentSlide);
  }

  return slides.length > 0 ? slides : [text];
};
