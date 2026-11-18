const lessonId = 'dc-12-hk1-1D3-v4';
const mathNumber = /<mn>(\d+)<\/mn>/g;

// Each rule names the numeric slots of a reviewed source revision, in MathML order.
// The same rule reproduces the source numbers and computes every dependent number.
function asymptoteChoice(constant, denominator, pole) {
    const shift = denominator * pole;
    return {
        prompt: [constant, denominator, shift],
        choices: [[1, denominator], [1, denominator], [1, denominator], [shift]],
        correct: 'C',
        solution: [pole, 1, denominator, 1, denominator, pole, pole],
    };
}

function distanceProduct(constant) {
    // y = 1 + constant/x. The product of the distances to x=0 and y=1 is constant.
    return {
        prompt: [constant],
        choices: [[1], [constant], [constant], [constant, constant]],
        correct: 'C',
        solution: [
            constant, 1, constant,                 // y = 1 + constant/x
            0, 1,                                  // asymptotes
            1, constant,                           // point M
            0, 1, 1, constant, 1, constant, constant, // the two distances
            constant, constant,                    // their product
        ],
    };
}

function axesAsymptotes(a, shift) {
    // The given axes require a equal to the first constant, and b equal to -shift.
    const expression = [a, 2, shift];
    const sum = a - shift;
    return {
        prompt: expression,
        choices: [[a], [shift], [a + shift], [sum]],
        correct: 'D',
        solution: [
            ...expression, ...expression, a, a, ...expression,
            a, 0, a, a, a + 2, shift, shift, shift, 0, shift, a, shift, sum,
        ],
    };
}

function horizontalThroughPoint(constant, pole, pointX, pointY) {
    return {
        prompt: [constant, pole, pointX, pointY],
        choices: [],
        correct: String(pointY),
        solution: [pole, constant, 1, pole, pointX, pointY, pointY],
    };
}

function givenAsymptotes(a, b, pole) {
    const shift = b * pole;
    return {
        prompt: [1, shift, pole, a, b],
        choices: [],
        correct: String(a + b),
        solution: [shift, shift, pole, a, b, b, a, a + b],
    };
}

function countDistinctPoles(coefficient, constant, pole) {
    return {
        prompt: [coefficient, constant, 2, pole * pole],
        choices: [[2], [1], [4], [3]],
        correct: 'D',
        solution: [pole, pole, 0, 0, pole, pole, pole, pole, 3],
    };
}

function negativeObliqueChoice(denominator, shift, slope, intercept, remainder) {
    // Q(x) = -slope*x - intercept, D(x) = denominator*x - shift.
    const quadratic = slope * denominator;
    const linear = intercept * denominator - slope * shift;
    const constant = remainder - intercept * shift;
    const asymptote = [slope, intercept];
    const division = [...asymptote, remainder, denominator, shift];
    const limit = [...division, 0];
    return {
        prompt: [quadratic, 2, linear, constant, denominator, shift],
        choices: [[intercept, slope], [slope, intercept], [intercept, slope], [slope, intercept]],
        correct: 'D',
        solution: [...division, shift, denominator, ...limit, ...limit, ...asymptote],
    };
}

function unitSlopeObliqueChoice(denominator, poleMagnitude, interceptNumerator, remainder) {
    // The implicit coefficient in -x fixes the slope at -1.
    const shift = denominator * poleMagnitude;
    const linear = interceptNumerator - shift;
    const constant = interceptNumerator * poleMagnitude - remainder;
    const asymptote = [interceptNumerator, denominator];
    const division = [...asymptote, remainder, denominator, shift];
    const limit = [...division, 0];
    return {
        prompt: [denominator, 2, linear, constant, denominator, shift],
        choices: [[...asymptote, 1], asymptote, [...asymptote, 1], asymptote],
        correct: 'D',
        solution: [...division, poleMagnitude, ...limit, ...limit, ...asymptote],
    };
}

function unitDenominatorObliqueChoice(shift, slope, intercept, remainder) {
    // D(x) = -x - shift, Q(x) = slope*x - intercept, R = -remainder.
    const linear = slope * shift - intercept;
    const constant = remainder - intercept * shift;
    const asymptote = [slope, intercept];
    const division = [...asymptote, remainder, shift];
    const limit = [...division, 0];
    return {
        prompt: [slope, 2, linear, constant, shift],
        choices: [[intercept, slope], [intercept, slope], [slope, intercept], [slope, intercept]],
        correct: 'D',
        solution: [...division, shift, ...limit, ...limit, ...asymptote],
    };
}

function fractionalObliqueChoice(denominator, shift, slopeNumerator, constant) {
    // The implicit +x term fixes the numerator's linear coefficient at +1.
    const square = denominator * denominator;
    const interceptNumerator = slopeNumerator * shift - denominator;
    const remainderNumerator = interceptNumerator * shift - constant * square;
    const asymptote = [slopeNumerator, denominator, interceptNumerator, square];
    const swapped = [interceptNumerator, square, slopeNumerator, denominator];
    const division = [...asymptote, remainderNumerator, square, denominator, shift];
    const limit = [...division, 0];
    return {
        prompt: [slopeNumerator, 2, constant, denominator, shift],
        choices: [swapped, asymptote, swapped, asymptote],
        correct: 'D',
        solution: [...division, shift, denominator, ...limit, ...limit, ...asymptote],
    };
}

function greatestCommonDivisor(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}

function countOneCancelledPole(pole, otherRoot) {
    const sum = pole + otherRoot;
    const product = pole * otherRoot;
    const square = pole * pole;
    const divisor = greatestCommonDivisor(otherRoot - pole, 2 * pole);
    const limitNumerator = (otherRoot - pole) / divisor;
    const limitDenominator = 2 * pole / divisor;
    const expression = [2, sum, product, 2, square];
    const infinity = [...expression, 2, 1, sum, product, 2, 2, 1, square, 2, 1];
    const vertical = [pole, ...expression];
    const removable = [
        pole, ...expression,
        pole, pole, otherRoot, pole, pole, pole, otherRoot, pole,
        limitNumerator, limitDenominator,
    ];
    return {
        prompt: expression,
        choices: [[2], [3], [0], [1]],
        correct: 'A',
        solution: [
            pole, pole, pole, pole,
            ...infinity, ...infinity,
            ...vertical, ...vertical,
            ...removable, ...removable,
            2, pole, 1,
        ],
    };
}

const templates = new Map([
    [2, {
        fingerprint: '899e44914333a6a49222ac0e53e4bfdeded68553ce4b237d08912d24e03fa47b',
        kind: 'mcq',
        original: [1, 2, 1],
        parameters: [[2, 3, 1], [1, 4, 2], [3, 5, 1], [4, 6, 2], [3, 7, 3], [5, 8, 1], [2, 9, 2], [5, 10, 3]],
        slots: asymptoteChoice,
    }],
    [3, {
        fingerprint: 'f5e8dd14730b916e7cdd36b7038547e53fca6fe818d2a97a41522f01c4130df1',
        kind: 'mcq',
        original: [3, 1, 2],
        parameters: [[2, 3, 3], [4, 5, 2], [9, 3, 6], [8, 8, 2], [8, 6, 5], [9, 7, 5], [3, 9, 6], [9, 6, 4]],
        slots: countDistinctPoles,
    }],
    [8, {
        fingerprint: '2f8c5265325146282c40c6f35e49f26662aad540c6573bd08d7c27a47826b61f',
        kind: 'mcq',
        original: [2, 1, 2, 3, 4],
        parameters: [[3, 1, 2, 3, 5], [2, 1, 3, 4, 7], [2, 1, 4, 6, 10], [6, 1, 2, 4, 8], [2, 1, 4, 8, 11], [4, 1, 3, 8, 10], [4, 3, 3, 5, 18], [5, 1, 2, 9, 10]],
        slots: negativeObliqueChoice,
    }],
    [10, {
        fingerprint: 'e133f69bd0fa002a35559fdbef4b02f778ff3688a284d9f032d1a344caa6469f',
        kind: 'mcq',
        original: [3, 1, 5, 3],
        parameters: [[2, 1, 5, 4], [4, 1, 7, 5], [3, 1, 10, 6], [3, 2, 11, 20], [3, 1, 8, 7], [5, 1, 7, 4], [5, 1, 12, 11], [2, 1, 7, 5]],
        slots: unitSlopeObliqueChoice,
    }],
    [11, {
        fingerprint: '0cf72738553083aef8a3acdd22cfbd1a0ff95fde3b3be0186961e2c4465da13e',
        kind: 'mcq',
        original: [4, 4, 12, 49],
        parameters: [[3, 3, 5, 17], [2, 5, 7, 17], [5, 5, 4, 24], [5, 3, 9, 50], [5, 4, 5, 26], [3, 6, 14, 46], [4, 6, 11, 49], [4, 2, 6, 28]],
        slots: unitDenominatorObliqueChoice,
    }],
    [12, {
        fingerprint: '432f7b630cbac82b6544d2e1bbd3a6ac62ebfe25e49f39f9a18e0839b92dfc84',
        kind: 'mcq',
        original: [3, 4, 4, 4],
        parameters: [[2, 3, 3, 4], [4, 3, 5, 1], [5, 8, 3, 1], [5, 4, 6, 1], [3, 8, 2, 7], [3, 4, 4, 5], [5, 7, 3, 2], [2, 7, 3, 3]],
        slots: fractionalObliqueChoice,
    }],
    [16, {
        fingerprint: '9d2905ed74c8711b57142ef2ac32d4f43fd7c59084fb3b844a48eccdf8b788df',
        kind: 'mcq',
        original: [2],
        parameters: [3, 5, 6, 7, 8, 10, 11, 12].map(n => [n]),
        slots: distanceProduct,
    }],
    [17, {
        fingerprint: '4f6fdef400b4a11f70ae2891c04c01692735f739fbe6dd91b5e0c210abb338b3',
        kind: 'mcq',
        original: [1, 4],
        parameters: [[2, 5], [3, 4], [3, 10], [2, 4], [1, 10], [3, 8], [5, 12], [2, 3]],
        slots: countOneCancelledPole,
    }],
    [34, {
        fingerprint: '3a157d264df21dc2ca356fdea32af74facd32ec754eae463269adc35350de2eb',
        kind: 'mcq',
        original: [3, 3],
        parameters: [[4, 3], [5, 3], [5, 2], [6, 2], [8, 3], [9, 3], [9, 2], [10, 2]],
        slots: axesAsymptotes,
    }],
    [50, {
        fingerprint: 'aa17c8bf1d596ec62306fa70b1cc47f3c6d9565c977faec316857881172dab51',
        kind: 'short',
        original: [2, 5, 1, 3],
        parameters: [[3, 4, 2, 4], [4, 3, 1, 5], [5, 6, 2, 6], [2, 7, 3, 7], [4, 6, 2, 8], [3, 8, 4, 9], [5, 4, 3, 10], [6, 9, 5, 2]],
        slots: horizontalThroughPoint,
    }],
    [51, {
        fingerprint: '060546732cc35e2d75331e70b3caf36a2de1dde0f6f4caba7b4604603560cb60',
        kind: 'short',
        original: [1, 2, 1],
        parameters: [[1, 3, 1], [2, 3, 2], [1, 5, 2], [3, 4, 1], [3, 5, 2], [4, 5, 3], [3, 7, 2], [5, 6, 1]],
        slots: givenAsymptotes,
    }],
]);

function matchesNumbers(html, expected) {
    if (typeof html !== 'string') return false;
    const found = [...html.matchAll(mathNumber)];
    return found.length === expected.length && found.every((match, i) => match[1] === String(expected[i]));
}

function approvedTemplate(question) {
    const number = question.original_number;
    const rule = templates.get(number);
    if (!rule || question.lesson_id !== lessonId ||
        question.id !== 'dc-12-hk1-1D3-q' + String(number).padStart(3, '0') + '-v4' ||
        question.bank_fingerprint !== rule.fingerprint || question.revision !== 1 ||
        question.kind !== rule.kind || question.archived_at ||
        question.bank_status !== 'auto' || question.verified_override) return null;

    const original = rule.slots(...rule.original);
    if (question.correct !== original.correct || !Array.isArray(question.choices) ||
        !matchesNumbers(question.prompt, original.prompt) ||
        !matchesNumbers(question.solution, original.solution) ||
        question.choices.length !== original.choices.length ||
        !question.choices.every((choice, i) =>
            choice.key === 'ABCD'[i] && matchesNumbers(choice.text, original.choices[i]))) return null;
    return rule;
}

const variantKey = (sourceNumber, index) => 'tc1-' + sourceNumber + '-' + (index + 1);

export function questionVariantKeys(question) {
    const rule = approvedTemplate(question);
    return rule ? rule.parameters.map((_, index) => variantKey(question.original_number, index)) : [];
}

function replaceNumbers(html, numbers) {
    let slot = 0;
    return html.replace(mathNumber, () => '<mn>' + numbers[slot++] + '</mn>');
}

export function buildQuestionVariant(question, key) {
    const rule = approvedTemplate(question);
    if (!rule) return null;
    const index = rule.parameters.findIndex((_, i) => variantKey(question.original_number, i) === key);
    if (index < 0) return null;

    const variant = rule.slots(...rule.parameters[index]);
    return {
        ...question,
        prompt: replaceNumbers(question.prompt, variant.prompt),
        choices: question.choices.map((choice, i) => ({
            ...choice, text: replaceNumbers(choice.text, variant.choices[i]),
        })),
        solution: replaceNumbers(question.solution, variant.solution),
        correct: variant.correct,
        accepted_answers: [],
        bank_meta: null,
        bank_tex: null,
        source: null,
        source_json: null,
        variant: {key, number: index + 1},
    };
}
