import { sliceNum } from "../common/numToAutoFixed";
import {
  commonLetterSpacing,
  commonLineHeight,
} from "../common/commonTextHeightSpacing";
import { convertFontWeight } from "../common/convertFontWeight";
import { SwiftuiDefaultBuilder } from "./swiftuiDefaultBuilder";
import {
  swiftuiFontMatcher,
  swiftuiWeightMatcher,
} from "./builderImpl/swiftuiTextWeight";
import { swiftuiSize } from "./builderImpl/swiftuiSize";

export class SwiftuiTextBuilder extends SwiftuiDefaultBuilder {
  modifiers: string[] = [];

  reset(): void {
    this.modifiers = [];
  }

  textAutoSize(node: TextNode): this {
    this.modifiers.push(this.wrapTextAutoResize(node));
    return this;
  }

  textDecoration(node: TextNode): this {
    // https://developer.apple.com/documentation/swiftui/text/underline(_:color:)
    if (node.textDecoration === "UNDERLINE") {
      this.modifiers.push(".underline()");
    }

    // https://developer.apple.com/documentation/swiftui/text/strikethrough(_:color:)
    if (node.textDecoration === "STRIKETHROUGH") {
      this.modifiers.push(".strikethrough()");
    }

    // https://developer.apple.com/documentation/swiftui/text/italic()
    if (
      node.fontName !== figma.mixed &&
      node.fontName.style.toLowerCase().match("italic")
    ) {
      this.modifiers.push(".italic()");
    }

    return this;
  }

  textStyle = (node: TextNode): this => {
    // for some reason this must be set before the multilineTextAlignment
    if (node.fontName !== figma.mixed) {
      const fontWeight = convertFontWeight(node.fontName.style);
      if (fontWeight && fontWeight !== "400") {
        const weight = swiftuiWeightMatcher(fontWeight);
        this.modifiers.push(`.fontWeight(${weight})`);
      }
    }

    // https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/typography/
    const retrievedFont = swiftuiFontMatcher(node);
    if (retrievedFont) {
      this.modifiers.push(`.font(${retrievedFont})`);
    }

    // todo might be a good idea to calculate the width based on the font size and check if view is really multi-line
    if (node.textAutoResize !== "WIDTH_AND_HEIGHT") {
      // it can be confusing, but multilineTextAlignment is always set to left by default.
      if (node.textAlignHorizontal === "CENTER") {
        this.modifiers.push(".multilineTextAlignment(.center)");
      } else if (node.textAlignHorizontal === "RIGHT") {
        this.modifiers.push(".multilineTextAlignment(.trailing)");
      }
    }

    return this;
  };

  letterSpacing = (node: TextNode): this => {
    const letterSpacing = commonLetterSpacing(node);
    if (letterSpacing > 0) {
      this.modifiers.push(`.tracking(${sliceNum(letterSpacing)})`);
    }

    return this;
  };

  // the difference between kerning and tracking is that tracking spaces everything, kerning keeps lignatures,
  // Figma spaces everything, so we are going to use tracking.
  lineHeight = (node: TextNode): this => {
    const letterHeight = commonLineHeight(node);

    if (letterHeight > 0) {
      this.modifiers.push(`.lineSpacing(${sliceNum(letterHeight)})`);
    }

    return this;
  };

  wrapTextAutoResize = (node: TextNode): string => {
    const [propWidth, propHeight] = swiftuiSize(node);

    let comp = "";
    if (node.textAutoResize !== "WIDTH_AND_HEIGHT") {
      comp += propWidth;
    }

    if (node.textAutoResize === "NONE") {
      // if it is NONE, it isn't WIDTH_AND_HEIGHT, which means the comma must be added.
      comp += ", ";
      comp += propHeight;
    }

    if (comp.length > 0) {
      const align = this.textAlignment(node);

      return `.frame(${comp}${align})`;
    }

    return "";
  };

  // SwiftUI has two alignments for Text, when it is a single line and when it is multiline. This one is for single line.
  textAlignment = (node: TextNode): string => {
    let hAlign = "";
    if (node.textAlignHorizontal === "LEFT") {
      hAlign = "leading";
    } else if (node.textAlignHorizontal === "RIGHT") {
      hAlign = "trailing";
    }

    let vAlign = "";
    if (node.textAlignVertical === "TOP") {
      vAlign = "top";
    } else if (node.textAlignVertical === "BOTTOM") {
      vAlign = "bottom";
    }

    if (hAlign && !vAlign) {
      // result should be leading or trailing
      return `, alignment: .${hAlign}`;
    } else if (!hAlign && vAlign) {
      // result should be top or bottom
      return `, alignment: .${vAlign}`;
    } else if (hAlign && vAlign) {
      // make the first char from hAlign uppercase
      const hAlignUpper = hAlign.charAt(0).toUpperCase() + hAlign.slice(1);
      // result should be topLeading, topTrailing, bottomLeading or bottomTrailing
      return `, alignment: .${vAlign}${hAlignUpper}`;
    }

    // when they are centered
    return "";
  };

  build(): string {
    return this.modifiers.join("");
  }
}