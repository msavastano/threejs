# Lessons Learned

## 1. Javascript Syntax Errors in File Editing

### Issue
When replacing code blocks that end with nested closing brackets and parentheses (e.g. `});` or `}`), it is extremely easy to accidentally delete or mismatch brackets. This leads to `Uncaught SyntaxError: missing ) after argument list` or similar parsing errors.

### Resolution/Prevention
1. **Double-Check Scope Boundaries**: When replacing code, always double-check that every opening bracket `{` and parenthesis `(` has a corresponding closing partner `}` and `)`.
2. **Review Diff Blocks**: Carefully look at the diff output. Ensure that any enclosing blocks (such as loops or event listeners) that were not meant to be modified remain closed.
3. **Run AST/Parser Verification**: For Javascript/HTML modifications, verify the code syntax locally before completing the task.

## 2. Three.js Curve Class Naming (THREE.CatmullRomCurve3)

### Issue
Using `THREE.CatmullRomCurve` results in `Uncaught TypeError: THREE.CatmullRomCurve is not a constructor` because 3D curves in Three.js are named `THREE.CatmullRomCurve3` (with a trailing `3`).

### Resolution/Prevention
1. **Always use `THREE.CatmullRomCurve3`** for 3D Catmull-Rom spline curves.
2. Verify exact class name constructors against standard Three.js API (`THREE.LineCurve3`, `THREE.QuadraticBezierCurve3`, `THREE.CubicBezierCurve3`, `THREE.CatmullRomCurve3`).

## 3. Three.js CatmullRomCurve3 `distanceToSquared` Array Out of Bounds

### Issue
In Three.js, `new THREE.CatmullRomCurve3(points, true)` with `closed = true` throws `TypeError: Cannot read properties of undefined (reading 'distanceToSquared')` when `getPointAt(1.0)` or `getPointAt(u)` ($u \ge 1.0$) is called. This happens because `closed = true` calculates `intPoint = points.length`, attempting to access `points[points.length]` which is `undefined`.

### Resolution/Prevention
1. Clamp curve parameter $u \in [0.0, 0.9999]$ using a helper:
   ```js
   function getSafePointOnCurve(curve, u) {
     const safeU = Math.min(0.9999, Math.max(0.0, (u % 1.0 + 1.0) % 1.0));
     return curve.getPointAt(safeU);
   }
   ```
2. Or use `closed = false` with repeating start/end points for seamless loops.
