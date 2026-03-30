import { describe, expect, it } from "vitest";
import {
  maskUserNameForLogs,
  redactCurrentUserText,
  redactCurrentUserValue,
} from "../log-redaction.js";

describe("log redaction", () => {
  it("redacts the active username inside home-directory paths", () => {
    const userName = "velquser";
    const maskedUserName = maskUserNameForLogs(userName);
    const input = [
      `cwd=/Users/${userName}/velq`,
      `home=/home/${userName}/workspace`,
      `win=C:\\Users\\${userName}\\velq`,
    ].join("\n");

    const result = redactCurrentUserText(input, {
      userNames: [userName],
      homeDirs: [`/Users/${userName}`, `/home/${userName}`, `C:\\Users\\${userName}`],
    });

    expect(result).toContain(`cwd=/Users/${maskedUserName}/velq`);
    expect(result).toContain(`home=/home/${maskedUserName}/workspace`);
    expect(result).toContain(`win=C:\\Users\\${maskedUserName}\\velq`);
    expect(result).not.toContain(userName);
  });

  it("redacts standalone username mentions without mangling larger tokens", () => {
    const userName = "velquser";
    const maskedUserName = maskUserNameForLogs(userName);
    const result = redactCurrentUserText(
      `user ${userName} said ${userName}/project should stay but avelquserz should not change`,
      {
        userNames: [userName],
        homeDirs: [],
      },
    );

    expect(result).toBe(
      `user ${maskedUserName} said ${maskedUserName}/project should stay but avelquserz should not change`,
    );
  });

  it("recursively redacts nested event payloads", () => {
    const userName = "velquser";
    const maskedUserName = maskUserNameForLogs(userName);
    const result = redactCurrentUserValue({
      cwd: `/Users/${userName}/velq`,
      prompt: `open /Users/${userName}/velq/ui`,
      nested: {
        author: userName,
      },
      values: [userName, `/home/${userName}/project`],
    }, {
      userNames: [userName],
      homeDirs: [`/Users/${userName}`, `/home/${userName}`],
    });

    expect(result).toEqual({
      cwd: `/Users/${maskedUserName}/velq`,
      prompt: `open /Users/${maskedUserName}/velq/ui`,
      nested: {
        author: maskedUserName,
      },
      values: [maskedUserName, `/home/${maskedUserName}/project`],
    });
  });

  it("skips redaction when disabled", () => {
    const input = "cwd=/Users/velquser/velq";
    expect(redactCurrentUserText(input, { enabled: false })).toBe(input);
  });
});
