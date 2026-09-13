# DELETE-LIST 2026-09-13 (v2.9k)

zip 은 **파일 삭제를 전하지 못해요.** 아래 두 개는 저장소에만 있고 zip 에는 없어서,
GitHub Desktop 이나 탐색기/파인더에서 직접 지우셔야 해요.

---

## 1. `.DS_Store`

맥이 폴더를 열 때 자동으로 만드는 숨김 파일이에요. `.gitignore` 에 이미 적혀 있는데
**그 전에 커밋돼서** 계속 따라다녀요. ignore 는 "아직 추적 안 하는 파일"에만 적용되거든요.

**지우는 법 (둘 중 하나)**
- 파인더에서 저장소 폴더의 `.DS_Store` 를 지우고 GitHub Desktop 에서 Commit
- 또는 터미널: `git rm --cached .DS_Store` → Commit

내용상 아무 의미 없는 파일이라 지워도 앱에 영향 없어요.

## 2. `UPDATE-理쒖쥌-0904.md`

한글 파일명이 깨진 채로(mojibake) 커밋된 파일이에요. 원본은 같은 날짜의
**`UPDATE-최종-0904.md`** 이고 그건 멀쩡히 있어요. 즉 **깨진 중복본**이에요.

"파일명은 영문만" 규칙이 막으려던 게 정확히 이 경우예요. 지금 빌드를 깨뜨리고 있진
않지만(루트 .md 라 빌드 대상이 아니에요), 남겨 둘 이유가 없어요.

---

## 지우지 않는 것 — 나머지 한글 파일명 16개

```
AWOS-인수인계-0905-evening.md   UPDATE-v43-법령대조.md
AWOS-인수인계-0905-night.md     UPDATE-v44-법령대조2.md
AWOS-인수인계-0909.md            UPDATE-v46-아이콘.md
UPDATE-v24-중간점검.md           UPDATE-v47-카카오심사.md
UPDATE-v37-확장성점검.md         UPDATE-v48-카카오이메일.md
UPDATE-v41-PDF직접생성.md        UPDATE-v50-경량초경량.md
UPDATE-최종-0904.md              UPDATE-v52-부채1.md
                                 UPDATE-v53-부채2.md
                                 UPDATE-v55-부채3.md
```

전부 루트의 `.md` 문서라 **빌드를 타지 않아요.** 인코딩도 정상이고요.
이력 문서라 지우면 오히려 손해라 그대로 둬요.

다만 지금 저장소 루트에 파일이 **85개**예요. 미팅 뒤에 `docs/history/` 같은 폴더로
옮기면 첫인상이 깔끔해져요. 급하진 않아요.
