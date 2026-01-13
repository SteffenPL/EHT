# Changelog (from 2026-01-16)

## 2026-01-16

- Fixed bug about statistics of position on basal-to-apical scale.
  Code wrongly used all apical points (also of detached cells) instead of only those which are still part of apical strip. Because of that bug, some control cells appeared to be extruded which was wrong.

- Added table with frame statistics & rendering of cell number to simulation view
  - Pressing on the arrows sorts the table

<img width="634" height="548" alt="image" src="https://github.com/user-attachments/assets/b1bef9e7-45e3-44ef-8347-da791abd79fb" />
