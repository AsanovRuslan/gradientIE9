function convertGradientToSvg( gradient ) {

    /*!
     * CSS2SVG 1.5.4 -- August 14, 2013
     * Original script by Kristiana M. Hansen -- www.kmhcreative.com
     * Updates by Anthony Martinez -- www.linkedin.com/in/canthonymartinez/
     * Licensed Under Creative Commons Attribution-Sharealike 3.0 -- creativecommons.org/licenses/by-sa/3.0/
     * Permission hereby granted to use or modify in any way you see fit, as long as this notice stays intact.
     */

    if (!gradient) {
        return false;
    };


    // AM: Encoded address, originally generated at rumkin.com/tools/mailto_encoder/custom.php -- substantially modded. For script reuse, delete or replace with a function you generate at the source URL.
    var doc = document;


    window.trim || (String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    }); // AM: IE8- doesn't natively support trim()


    // AM: adapted from stackoverflow.com/a/6970814 -- allows for parsing of multiple backgrounds.
    function split(string) {
        var token = /((?:(?:rgb|hsl)a?\(.*?\)\s*\d{0,3}(?:\.\d+)?%?|[^"']|".*?"|'.*?')*?)([(,)]|$)/g; // AM: Modded to permit (rgb|hsl)a?(<colors>) <stop>%, -- without fix, the <stop>% gets trashed, throwing off everything else--ugh.
        token.lastIndex = 0;
        return (function recurse() {
            for (var array = [];;) {
                var result = '';
                result = token.exec(string);
                if (result[2] === '(') {
                    array.push(result[1].trim() + '(' + recurse().join(',') + ')');
                    result = token.exec(string);
                }
                else {
                    array.push(result[1].trim());
                }
                if (result[2] !== ',') {
                    return array;
                }
            }
        })();
    }

    var vect, svg, uri, h, w,
        defSvg = '<svg width="300px" height="300px" style="background:#ccc"></svg>',
        inp = gradient,
        uCode = '',
        uOut, bgsUriOut, bUriOut, sel, rep,
        x1, y1, x2, y2, tx1, ty1, tx2, ty2, c = 100,
        dir, dl, bgs, co, col,
        colorArr = [],
        stopArr, stl,
        units, prev, prevW, bl, oldWebkit, error, bgSize, bgSizeStr, toFromFix, hex, downWarnDiv,
        cocheck = "Check your gradient direction and/or color values.",
        trans = /rgba|hsla|transparent/,
        bgSt = /background-size:[^;}]+/i;

    // AM: This function borrowed from gist.github.com/mstalfoort/1293822
    function hasInlSvg() {
        var svgd = doc.createElement('div');
        svgd.innerHTML = '<svg></svg>';
        return (svgd.firstChild && svgd.firstChild.namespaceURI) === 'http://www.w3.org/2000/svg';
    }


    function splitGradient(string) {
        bgsUriOut = dir = error = uri = ''; // AM: These must get reset upon each iteration of the css loop above
        if (string.match(/radial/)) {
            error = "The script currently supports only LINEAR gradients.";
            return !1;
        }
        else if (string.match(/\d(r?em|ex|ch|vh|vm|vmin|vmax)/)) {
            error = 'Font- or viewport-relative units are not supported. Valid units are "%", "px", "cm", "mm", "in", "pt", and "pc".';
            return !1;
        }
        // AM: Check for incorrect hex colors here since they may escape the color check below and affect rendering, cause the script to trip, or other weird stuff.
        else if (string.match(/#([\da-f]{4,5}|[\da-f]{1,2})\W/)) {
            error = cocheck;
            return !1;
        }
        if (string.match(bgSt)) {
            bgSize = 'yes';
            bgSizeStr = string.match(bgSt)[0];
            string = string.replace(bgSt, '');
        }
        bgs = split(string), bl = bgs.length;

        if (!!bgSize) {
            bgs.reverse();
        } // AM: Reverse gradients to process in correct order if background-size detected

        while (bl--) {
            rep = '';
            stopArr = [];
            if (bgs[bl].match(/repeating/)) {
                rep = 'yes';
            }
            // AM: Find angle
            if (bgs[bl].match(/\-?\d{0,3}(\.\d+)?(deg|g?rad\b|turn)/)) {
                dir = bgs[bl].match(/\-?\d{0,3}(?:\.\d+)?(?:deg|g?rad|turn)/gi);
                if (dir[1].match(/g?rad|turn/)) // AM: convert other units to degrees
                {
                    var pf1 = parseFloat(dir[1]);
                    if (dir[1].match(/grad/)) {
                        dir[1] = pf1 / 1.1111111;
                    }
                    else if (dir[1].match(/rad/)) {
                        dir[1] = pf1 / 0.0174532925199;
                    }
                    else {
                        dir[1] = pf1 * 360;
                    }
                }
                dir = parseFloat(dir[1]);
                if (!bgs[bl].match(/-(moz|webkit|o|ms)-/)) {
                    dir = 90 - dir;
                } // AM: Degrees in unprefixed W3C syntax are measured differently
            }
            // AM: isolate old WebKit syntax
            else if (bgs[bl].match(/-webkit-gradient/)) {
                var s = /left|right|\btop\b|bottom|center/g;
                dl = 4;
                if (bgs[bl].match(s)) {
                    dir = bgs[bl].match(s);
                    while (dl--) {
                        dir[dl] = dir[dl].replace(/left|top/g, 0).replace(/right|bottom/g, 100).replace(/center/g, 50);
                    } // AM: convert keywords to corresponding percents
                }
                else { // AM: Point-to-point figures
                    dir = bgs[bl].match(/(\-?\d+\.?\d*%?)/g);
                    dir = dir.slice(0, 4); // AM: Get only what's needed, the first four #s or %s
                    while (dl--) {
                        if (!dir[dl].match(/%/)) // AM: Convert pixel values to %
                        {
                            var wh = dl % 2 === 1 ? h : w; // AM: Make sure x-points get divided by width and y, by height
                            dir[dl] = dir[dl] / wh * c;
                        }
                        dir[dl] = parseFloat(dir[dl]);
                    }
                }
                x1 = Math.round(dir[0] * c) / c, y1 = Math.round(dir[1] * c) / c,
                x2 = Math.round(dir[2] * c) / c, y2 = Math.round(dir[3] * c) / c;
                oldWebkit = 'yes', toFromFix = bgs[bl].match(/from\(.*?\),\s*to\(.*?\),\s*color-stop/) ? 'yes' : ''; // AM: WebKit allows to() to come before color-stops. If that happens, then extra processing will happen below.
            }
            // AM: No angle defined, so check for origin or destination keywords
            else if (bgs[bl].match(/(to )?(top|left|right|bottom)/)) {
                dir = bgs[bl].match(/(to )?(top|left|right|bottom)\s?(top|left|right|bottom)?/gi);
                if (dir[0].match(/(right|left)/)) {
                    dir[0] = dir[0].replace(/(right|left)\s(top|bottom)/g, "$2$1");
                } // AM: normalize keyword order for normalizeAngle
                dir = dir[0].replace(/\s/g, '');
            }
            else if (!bgs[bl].match('center')) {
                dir = 'tobottom';
            } // AM: no angle or keywords defined; use default 'to bottom'. If 'center' is found, error will be thrown below in normalizeAngle.
            bgs[bl] = bgs[bl].replace(/.*?{|color-stop|repeating|linear|radial|gradient|-(moz|webkit|o|ms)-|background(-image)?\:|deg|g?rad|turn|to\s|\btop\b|right|left|bottom|center|-(?!\s+\d)|^\(,|\)$| \b/gm, '').
            // AM: If stop-values are present, bound them with '
            replace(/(\)|#(?:[\da-f]{3}){1,2}(?!(?:%|px|cm|mm|in\b|pt|pc))|(?:from|to|[^blac])\(|(?:,|\()[a-z]+)(calc\([^)]+\)|\d{0,3}\.?\d*(%|px|cm|mm|in\b|pt|pc)|0?\.\d+)/ig, "$1'$2'");
            // AM: Match colors and stop-values when present
            colorArr = bgs[bl].match(/(?:from\(|to\()?('.*?',)?(#([\da-f]{3}){1,2}(?!%|px|cm|mm|in\b|pt|pc)|(rgb|hsl)a?\((\d{0,3}(\.\d+)?%?,?){3}[0-1]?\.?\d*\)|[a-z]{5,}|[a-eg-z]{3,})('.*?')?/gi), col = colorArr.length, co = col;
            while (col--) {
                stopArr[col] = colorArr[col].replace(/.*?'|[^']*/, "'").replace(/'(.*?)'.*?,/, "$1").replace(/'/g, ''); // AM: Separate stop-values into new array
                colorArr[col] = colorArr[col].replace(/(from|to)\(|'.*?',?/g, ''); // AM: Remove stops and other junk to leave colors
                /* AM: Test for parsable colors in gradient. Ex: Browsers should throw an error (at least FF does) if rgb() has 4 values, which above regex allows. 
                 * Test only runs in browsers supporting CSS3 colors. Older ones like IE8-, FF2-, O9.6-, and S3.0- skip it.
                 * Test is permissive. Chances are, it will let RGB values >255, alpha values >1, HSL hues >360, and percents >100 pass even when invalid. Browsers usually cap such values, anyway.
                 * However, there's no error-checking here for totally invalid values that colorArr will miss above, such as negative RGB decimal values.
                 * Test will also pick up any stray values not processed by the direction check above.
                 */
                var d = doc.createElement('div');
                d.style.cssText = "color:rgba(0,0,0,0)";
                if (d.style.color) {
                    d.style.cssText = 'color:' + colorArr[col];
                    if (!d.style.color) {
                        error = cocheck;
                        return !1;
                    }
                }
                d = null;
            }
            stl = stopArr.length;
            if (!!oldWebkit) {
                while (stl--) {
                    if (!stopArr[stl].match(/%/)) {
                        stopArr[stl] = parseFloat(stopArr[stl]) * c + '%';
                    }
                } // AM: convert WebKit-style decimals to %s
                if (!!toFromFix) {
                    var fix = colorArr.splice(1, 1);
                    colorArr.push(fix.toString());
                    stopArr.splice(1, 1);
                    stopArr.push('100%');
                } // AM: Move color in to() function to end of array
            }
            if (!oldWebkit) {
                normalizeAngle(dir, bl);
            }
            else {
                buildSvg(bl);
            }
            if (!!error) {
                return !1;
            }
            if (!!bgSize) {
                finishSVG(svg, uri, 1);
            } // AM: Process each gradient into individual SVG files... inefficient, but it's the only way I know of currently to allow for proper usage of background-size in CSS.
        }
        if (!bgSize && !error) {
            finishSVG(svg, uri, bgs.length);
        }
        else {
            if (b.checked) {
                bUriOut += sel + 'background:' + bgsUriOut + '}\n\n';
                bUriOut = bUriOut.replace(/,\n}/g, '}');
            }
            bgsUriOut = bgsUriOut.replace(/,\n$|,$/g, '');
            uCode = bgsUriOut;
            out.readOnly = 1;
            out.value = 'Output display, editing, and updating is unavailable while using "background-size" in your input. To make changes, edit your original input and convert again.';
        }
    }

    function normalizeAngle(st, bl) {
        var d = 'to',
            t = 'top',
            r = 'right',
            b = 'bottom',
            l = 'left';
        if (isNum(st)) {
            svgAngle(st, bl);
        } // AM: Angle defined, proceed to calculate vector coords
        else {
            /* AM: Direction keywords defined -- use pre-determined vector coords and then go to buildSvg.
             * Also sets up variables needed for converting pixel-based color-stops to SVG offset values.
             * 'center' is a missing keyword. It's invalid in the new W3C syntax, and was poorly supported in the previous prefixed syntax (apparently, only FF supported it).
             * Old Webkit syntax is entirely isolated and processed separately before ever reaching this point, thus making it possible to keep the below matrix simple.
             */
            x1 = y1 = y2 = tx1 = ty1 = tx2 = ty2 = 0, x2 = c; // AM: reset default coords with each convert. Otherwise, strange things happen, especially with multiple gradients.
            if (st === d + r || st === l) {
                tx2 = w;
            }
            else if (st === d + t + r || st === b + l) {
                y1 = c, ty1 = h, tx2 = w;
            }
            else if (st === d + t || st === b) {
                x1 = y1 = c, tx1 = tx2 = w, ty1 = h;
            }
            else if (st === d + t + l || st === b + r) {
                x1 = y1 = c, x2 = 0, tx1 = w, ty1 = h;
            }
            else if (st === d + l || st === r) {
                x1 = y1 = y2 = c, x2 = 0, tx1 = ty2 = w, ty1 = h;
            }
            else if (st === d + b + l || st === t + r) {
                x1 = y2 = c, x2 = 0, tx1 = w, ty2 = h;
            }
            else if (st === d + b || st === t) {
                x2 = 0, y2 = c, ty2 = h;
            }
            else if (st === d + b + r || st === t + l) {
                y2 = c, tx2 = w, ty2 = h;
            }
            else {
                error = "Check your direction value(s). Valid keywords are 'top', 'right', 'bottom', and 'left'.";
                return !1;
            }
            buildSvg(bl);
        }
    }

    // AM: check if variable is a number -- stackoverflow.com/a/1421988
    function isNum(o) {
        return !isNaN(o - 0) && o !== null && o !== "" && o !== false;
    }

    function svgAngle(v, bl) {
        // AM: Code is adapted from visualcsstools.com -- determines vect coords based on angle
        var wc = w / 2,
            hc = h / 2,
            m, n = 0,
            o = 0,
            r = 360,
            mx = 10000,
            k = ((v % r) + r) % r,
            j = (r - k) * Math.PI / 180,
            i = Math.tan(j),
            l = hc - i * wc;
        tx1 = ty1 = tx2 = ty2 = null;
        if (k === 0) {
            tx1 = w, ty1 = ty2 = hc, tx2 = '0';
        }
        else if (k < 90 || k > 270) {
            n = w;
        }
        else if (k === 90) {
            tx1 = tx2 = wc, ty1 = '0', ty2 = h;
        }
        else if (k === 180) {
            tx1 = '0', ty1 = ty2 = hc, tx2 = w;
        }
        else if (k === 270) {
            tx1 = tx2 = wc, ty1 = h, ty2 = '0';
        }
        if (k > 180) {
            o = h;
        }
        m = o + (n / i);
        // AM: I could not quite figure out what m, n, and o are supposed to represent from the original code on visualcsstools.com
        tx1 = !tx1 ? i * (m - l) / (Math.pow(i, 2) + 1) : tx1;
        ty1 = !ty1 ? i * tx1 + l : ty1,
        tx2 = !tx2 ? w - tx1 : tx2,
        ty2 = !ty2 ? h - ty1 : ty2;
        x1 = Math.round(tx2 / w * mx) / c, y1 = Math.round(ty2 / h * mx) / c,
        x2 = Math.round(tx1 / w * mx) / c, y2 = Math.round(ty1 / h * mx) / c,
        buildSvg(bl);
    }

    function buildSvg(bl) {
        var sGrad = '',
            uGrad = '',
            sj = stopArr.join(),
            sal = stopArr.length,
            sr = sal < 20 ? 1000 : 10000, // AM: With many stops, a greater decimal precision of offsets may help
            rl = Math.sqrt(Math.pow(tx1 - tx2, 2) + Math.pow(ty1 - ty2, 2)); // AM: This calculation (for some hypotenuse, maybe?) needed for later converting pixel color-stops to offset values. Adapted from visualcsstools.com.
        // AM: Add first and last stops if missing
        if (!isNum(parseFloat(stopArr[0]))) {
            stopArr[0] = '0%';
        }
        if (!isNum(parseFloat(stopArr[co - 1]))) {
            stopArr[co - 1] = !sj.match(/calc|px|cm|mm|in\b|pt|pc/) ? '100%' : rl + "px";
        }
        calcStops(rl); // AM: check if any more stops are missing, and if so, calculate them
        if (!!error) {
            return !1;
        }

        if (y1 === y2) {
            y1 = y2 = 0;
        } // AM: equal y-values safe to zero out
        vect = " gradientUnits='userSpaceOnUse' x1='" + x1 + "%' y1='" + y1 + "%' x2='" + x2 + "%' y2='" + y2 + "%'";
        // AM: remove gradientUnits if coords are within bounding box...except in case of old Webkit syntax, which apparently (and oddly) depends on it for accurate rendering. Go figure.
        if (x1 >= 0 && x1 <= c && y1 >= 0 && y1 <= c && x2 >= 0 && x2 <= c && y2 >= 0 && y2 <= c && !oldWebkit) {
            vect = vect.replace(" gradientUnits='userSpaceOnUse'", '');
        }

        if (!vect.match(/gradientUnits/))
        /* AM: Convert vect coords to decimal to save more bytes (also, since % signs have to be encoded as '%25' anyway in data-URI output, costing a few extra bytes),
         * but only when gradientUnits='userSpaceOnUse' is not present -- in that case, they must remain unchanged, or else the rendering will be wrong.
         */
        {
            vect = vect.replace(/x1='[^']+/, "x1='" + x1 / c).replace(/y1='[^']+/, "y1='" + y1 / c).replace(/x2='[^']+/, "x2='" + x2 / c).replace(/y2='[^']+/, "y2='" + y2 / c);
        }

        bl = !bgSize ? bl : 0; // AM: If background-size in use, reset id on each gradient
        vect = "<linearGradient id='g" + (bl + 1) + "'" + vect + ">\n";
        for (var i = 0; i < sal; i++) {
            var s = stopArr[i],
                ps = parseFloat(s);
            s = !s.match(/px/) ? ps / c : ps / rl; // AM: plug in pre-calculated offset or convert pixel color-stops to proper offset value
            var off = Math.round(s * sr) / sr,
                color = fixColor(colorArr[i]),
                opac = addOpacity(colorArr[i]);
            sGrad += "<stop offset='" + off + "' stop-color='" + color + "'";
            if (colorArr[i].match(trans)) {
                sGrad += " stop-opacity='" + opac + "'";
            }
            sGrad += "></stop>\n";

            /* AM: For IE9 data URI, preserve original (semi)transparent colors since IE9 renders them correctly anyway, and they take fewer bytes than stop-color + stop-opacity.
             * Input with background-size will get cross-browser data URI output unless IE9 checkbox is marked.
             */

            uGrad += "<stop offset='" + off + "'";
            color = colorArr[i].match(trans) ? colorArr[i] : color;
            uGrad += " stop-color='" + color + "'";

            uGrad += '></stop>\n';
        }

        if (!!rep) // AM: Logic for repeating gradients. It finds the difference between the last & first offsets, multiplies coords by that to resize the gradient and adjusts offsets to make them relative to the new size.
        {
            var stops = sGrad.match(/t='(\d?\.?\d+)'/g),
                sl, sl2, nStops = [];
            sl = sl2 = stops.length;
            while (sl--) {
                stops[sl] = stops[sl].replace(/t='|'/g, '');
            }
            var pso = parseFloat(stops[sl2 - 1]),
                diff = pso - parseFloat(stops[0]),
                mul = 1 / pso;
            while (sl2--) {
                nStops[sl2] = Math.round(parseFloat(stops[sl2]) * mul * sr) / sr, nStops[0] = 0,
                sGrad = sGrad.replace(stops[sl2], nStops[sl2]);
                if (!!bgSize) {
                    uGrad = uGrad.replace(stops[sl2], nStops[sl2]);
                }
            }
            var xy = [x1, y1, x2, y2],
                z = 4;
            while (z--) {
                xy[z] = Math.round(xy[z] * diff * c) / c + '%';
            }
            vect = vect.replace(/x1='[^']+/, "x1='" + xy[0]).replace(/y1='[^']+/, "y1='" + xy[1]).replace(/x2='[^']+/, "x2='" + xy[2]).replace(/y2='[^']+/, "y2='" + xy[3]).replace("ent ", "ent spreadMethod='repeat' ");
        }

        vect = vect.replace(/ x1='0%?'| x2='(100%|1)'| y1='0%?'| y2='0%?'/g, '').replace("'0%", "'0"); // AM: remove defaults and units from zeros

        if (!bgSize) {
            svg += vect, uri += vect;
        }
        else {
            svg = vect, uri = vect;
        }
        svg = svg + sGrad, uri = uri + uGrad;

        // AM: remove default values and leading zeros when present
        var s2 = /offset='0' | stop-opacity='1'/g,
            s3 = /'0\./g,
            r = "'.",
            en = "</linearGradient>\n";
        svg = svg.replace(s2, '').replace(s3, r) + en;
        uri = uri.replace(s2, '').replace(s3, r) + en;
        return svg, uri;
    }

    function calcStops(rl) {
        var u = 0,
            y = 0,
            stp = 0;
        while (y < stl) {
            if (stopArr[y].match(/\d/)) {
                if (stopArr[y].match(/calc|cm|mm|in|pt|pc/)) {
                    stopArr[y] = fixStops(stopArr[y], rl);
                }
                var unit = stopArr[y].match(/%|px/),
                    s = y,
                    z = 0,
                    st = parseFloat(stopArr[s]);
                while (z < s) {
                    if (!stopArr[z].match(/\d/)) {
                        stopArr[z] = stp + ((st - stp) / (s - u)) * (z - u) + unit;
                    }
                    z++;
                }
                u = z, stp = parseFloat(stopArr[s]);
            }
            y++;
        }
    }

    // AM: Convert other units to pixels
    function fixStops(x, rl, g, f, y, i, z) {
        y = 1, z = '';
        // AM: parse stop value or split calc() expression if present
        if (!x.match(/calc/)) {
            f = parseFloat(x);
        }
        else {
            g = x.replace(/^calc\(|\)$/g, '').replace(/(\*|\/)/g, ' $1 ').split(' '), y = g.length;
        }
        for (i = 0; i < y; i++) {
            if (y > 1) {
                x = g[i], f = parseFloat(g[i]);
            }
            if (x.match(/cm/)) {
                f *= 37.79527559;
            }
            else if (x.match(/mm/)) {
                f *= 3.779527559;
            }
            else if (x.match(/in/)) {
                f *= 96;
            }
            else if (x.match(/pt/)) {
                f *= 1.33333333;
            }
            else if (x.match(/pc/)) {
                f *= 16;
            }
            else if (x.match(/%/)) {
                f = (f / 100) * rl;
            }
            else if (!x.match(/px/)) {
                f = x;
            }
            if (y > 1) {
                z += f;
            } // AM: convert calc() to expression with normalized units
        }
        return z ? eval(z) + 'px' : (f * c) / c + 'px';
    }

    function fixColor(hu) {
        /* AM: To conform to the SVG spec, colors should be CSS2-compatible values, which excludes RGBA and HSL/A.
         * This function will convert RGB/A and HSL/A, as well as most SVG/CSS3 color names, to hex to not only satisfy the SVG spec,
         * but also make the output SVG more efficient.
         */
        var crgb, cl, cp, cpl, hsl, flo = /(\d+(\.\d+)?)|\.\d+/g,
            na = /[a-z]{8,}|black|white|yellow|fuchsia|magenta/i;
        if (hu.match(/transparent/)) {
            return '#000';
        }
        /* AM: Browsers don't agree here. FF and IE render 'transparent' as white, but black follows the CSS3 spec, and Chrome/Safari/Opera follow it.
         * However, the keyword appears to be undefined in the SVG spec, so, this could be a matter up for debate.
         */
        else if (hu.match(/rgba?|hsla?/) || hu.match(na)) {
            if (hu.match(/rgba?/)) {
                if (hu.match(/%/)) // AM: Convert %s to dec
                {
                    cp = hu.match(flo), cpl = cp.length;
                    while (cpl--) {
                        cp[cpl] = cp[cpl] / c * 255;
                    }
                }
                crgb = !cp ? hu.match(/\d{1,3}/g) : cp, cl = crgb.length;
                while (cl--) {
                    crgb[cl] = crgb[cl] > 255 ? 255 : crgb[cl];
                }
            } // AM: Cap any errant values over max
            /* AM: convert colors >7 letters into hex since #RRGGBB takes fewer bytes. The additional listed colors will shrink down to #RGB.
             * FF2- and IE8- do not support getComputedStyle, so, those browsers will just return the original input.
             */
            else if (hu.match(na) && window.getComputedStyle) {
                var d = doc.createElement("div");
                d.style.color = hu.match(na)[0];
                doc.body.appendChild(d);
                crgb = getComputedStyle(d, null).color; // AM: gives color in rgb()
                if (!crgb.match(/rgb/)) {
                    return hu;
                } // AM: Abort and return input if not processed correctly (older browsers not supporting CSS3/SVG color names, for instance)
                crgb = crgb.replace(/[^\d,]/g, '').split(',');
                doc.body.removeChild(d);
            }
            else if (hu.match(/hsla?/)) {
                hsl = hu.match(flo);
                // AM: Convert HSL to RGB first (making sure any errant s & l >100 get capped), then convert result to hex below
                crgb = hslToRgb(hsl[0] % 360 / 360, Math.min((hsl[1]) / c, 1), Math.min((hsl[2]) / c, 1));
            }
            else {
                return hu;
            }
            rgbToHex(crgb[0] | 0, crgb[1] | 0, crgb[2] | 0); // AM: |0 forces int value
            return '#' + hex;
        }
        else {
            return hu;
        }
    }

    function addOpacity(op) { // AM: convert alpha or 'transparent' to stop-opacity
        if (op.match(trans)) {
            if (op.match(/(?:\d*(?:\.\d+)?%?,){3}0?(\.\d+)?\)/)) // AM: search for a color triplet and capture its alpha value
            {
                var opv = op.match(/(0?(\.\d+)?)\)/)[1];
                return opv.replace('0.', '.');
            }
            else if (op.match(/transparent/)) {
                return '0';
            }
            else {
                return '1';
            }
        }
        else {
            return '';
        }
    }

    function rgbToHex(r, g, b) { // AM: Code adapted from stackoverflow.com/a/5624139
        hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        var s = /(\w)\1(\w)\2(\w)\3/i;
        // AM: If hex can be shrank to 3-digits, then do it. \w searches a-z, A-Z, & 0-9, but hex will only have a-f and 0-9.
        hex = hex.match(s) ? hex.replace(s, '$1$2$3') : hex;
        return hex;
    }

    // AM: This function adapted from stackoverflow.com/a/9493060
    function hslToRgb(h, s, l) {
        var r, g, b;

        function hue2rgb(p, q, t) {
            if (t < 0) {
                t += 1;
            }
            if (t > 1) {
                t -= 1;
            }
            if (t < 1 / 6) {
                return p + (q - p) * 6 * t;
            }
            if (t < 1 / 2) {
                return q;
            }
            if (t < 2 / 3) {
                return p + (q - p) * (2 / 3 - t) * 6;
            }
            return p;
        }

        if (s === 0) {
            r = g = b = l;
        } // achromatic
        else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s,
                p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3), g = hue2rgb(p, q, h), b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r * 255, g * 255, b * 255];
    }

    function finishSVG(svg, uri, bl) {
        var rects = '',
            svHead = "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + units + "' height='" + h + units + "'>\n",
            svDefs = "<defs>\n" + svg + "</defs>\n"; // AM: Safari 5.1 is dumb, requiring the otherwise unneeded <defs> element for the preview
        while (bl--) {
            rects += "<rect width='100%' height='100%' fill='url(#g" + (bl + 1) + ")'></rect>\n";
        }
        var svEnd = "</svg>";
        svg = svHead + svDefs + rects + svEnd;
        // AM: Show SVG source and preview only when Batch Mode is not active

        uri = svHead + uri + rects + svEnd;
        svgToUri(uri);
    }

    function svgToUri(uri) {
        uri = uri.replace(/\n|<\/?defs>/g, '').replace(/svg' width='.*?' height='.*?'/, "svg'"); // AM: remove some stuff to save bytes. For CSS usage, SVG width and height are rarely needed
        // AM: encode output for use in CSS "data:" string. Opening/closing brackets, % signs, and # must be encoded. Spaces don't, so, convert them back from %20 to save bytes and slightly improve readability.
        uOut = 'url("data:image/svg+xml,' + encodeURI(uri).replace(/%20/g, ' ').replace(/#/g, '%23') + '")';
        uCode = uOut;
        if (!!bgSize) {
            bgsUriOut += uOut + ',\n';
        }
    }

    function startConvert() {
        oldWebkit = toFromFix = vect = svg = bgSize = bgsUriOut = bUriOut = sel = ''; // AM: reset key variables upon each convert, otherwise, strange gradient renderings may occur
        w = 100, h = 100,
        units = '%';

        splitGradient(inp);

        return uCode;

    }

    return startConvert()

};

// console.time implementation for IE
if(window.console && typeof(window.console.time) == "undefined") {
    console.time = function(name, reset){
        if(!name) { return; }
        var time = new Date().getTime();
        if(!console.timeCounters) { console.timeCounters = {}; }
        var key = "KEY" + name.toString();
        if(!reset && console.timeCounters[key]) { return; }
            console.timeCounters[key] = time;
        };

    console.timeEnd = function(name){
        var time = new Date().getTime();
        if(!console.timeCounters) { return; }
        var key = "KEY" + name.toString();
        var timeCounter = console.timeCounters[key];
        var diff;
        if(timeCounter) {
            diff = time - timeCounter;
            var label = name + ": " + diff + "ms";
            console.info(label);
            delete console.timeCounters[key];
        }
        return diff;
    };
};

 function loopStylesheet ( stylesheet, prop ) {

 	var rules = stylesheet.cssRules,
     	rulesLength = rules.length,
     	element;

     	// http://jsperf.com/fastest-array-loops-in-javascript/183
		for ( var i = 0, l = rulesLength; i !== l; i++ ) {

     		element = rules[i];

	         if ( !element.media && element.style && element.style[prop] ) {

	            element.style.backgroundImage = convertGradientToSvg(element.style[prop]);
	         }

     	}

 };

function modifyCss ( prop ) {

	console.time('processing time');

	var property =  '-pie-background',
    	stylesheet = document.styleSheets;

    // http://jsperf.com/fastest-array-loops-in-javascript/183
	for ( var i = 0, l = stylesheet.length; i !== l; i++ ) {
        loopStylesheet( stylesheet[i], property );
    }

    console.timeEnd('processing time');

};

document.addEventListener( "DOMContentLoaded", modifyCss, false );