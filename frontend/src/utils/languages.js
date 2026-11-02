/**
 * Supported programming languages configuration for CodeFix AI
 */

export const SUPPORTED_LANGUAGES = [
  {
    id: 'python',
    name: 'Python 3.11',
    shortName: 'Python',
    monacoLang: 'python',
    ext: '.py',
    badge: 'Python 3.11',
    defaultCode: `import sys

def calculate_average(numbers):
    total = 0
    for i in range(len(numbers)):
        total += numbers[i]
    # Bug: Crashes with ZeroDivisionError when numbers list is empty
    return total / len(numbers)

# Read numbers from stdin (space-separated)
raw_input = sys.stdin.read().strip()
numbers_list = [float(x) for x in raw_input.split()] if raw_input else []
print("Average is:", calculate_average(numbers_list))`,
    defaultDescription: 'Calculate the average of numbers in a list, handling empty lists safely by returning 0.0.',
    defaultTestCases: [
      { id: 'tc-1', input: '', expectedOutput: 'Average is: 0.0', isEdgeCase: true, label: 'Edge Case: Empty List (ZeroDivisionError)' },
      { id: 'tc-2', input: '10 20 30', expectedOutput: 'Average is: 20.0', label: 'Standard: Positive Integers' },
      { id: 'tc-3', input: '42', expectedOutput: 'Average is: 42.0', isEdgeCase: true, label: 'Edge Case: Single Element' },
      { id: 'tc-4', input: '-10 -20 -30', expectedOutput: 'Average is: -20.0', label: 'Negative Numbers' },
      { id: 'tc-5', input: '0 0 0', expectedOutput: 'Average is: 0.0', isEdgeCase: true, label: 'Edge Case: All Zeroes' }
    ],
    samples: [
      {
        name: 'Python Sample: ZeroDivisionError',
        description: 'Calculate average of numbers, crashing when list is empty.',
        code: `import sys

def calculate_average(numbers):
    total = 0
    for i in range(len(numbers)):
        total += numbers[i]
    return total / len(numbers)

raw = sys.stdin.read().strip()
numbers_list = [float(x) for x in raw.split()] if raw else []
print("Average is:", calculate_average(numbers_list))`
      },
      {
        name: 'Python Sample: Syntax Error',
        description: 'Missing colon and unclosed string in eligibility check.',
        code: `def check_voting_eligibility(age)
    if age >= 18:
        return "Eligible to vote"
    else:
        return 'Not eligible to vote`
      },
      {
        name: 'Python Sample: Clean Factorial',
        description: 'Valid, working factorial calculation.',
        code: `def factorial(n):
    if n in (0, 1):
        return 1
    res = 1
    for i in range(2, n + 1):
        res *= i
    return res

print("Factorial of 5 is:", factorial(5))`
      }
    ]
  },
  {
    id: 'javascript',
    name: 'JavaScript (Node.js)',
    shortName: 'JavaScript',
    monacoLang: 'javascript',
    ext: '.js',
    badge: 'Node.js 20',
    defaultCode: `const fs = require('fs');

function calculateAverage(numbers) {
    let total = 0;
    for (let i = 0; i < numbers.length; i++) {
        total += numbers[i];
    }
    // Bug: 0 / 0 returns NaN when list is empty
    return total / numbers.length;
}

const input = fs.readFileSync(0, 'utf-8').trim();
const list = input ? input.split(/\\s+/).map(Number) : [];
console.log("Average is: " + calculateAverage(list));`,
    defaultDescription: 'Calculate average of numbers in an array, returning 0 if the array is empty.',
    defaultTestCases: [
      { id: 'tc-1', input: '', expectedOutput: 'Average is: 0', isEdgeCase: true, label: 'Edge Case: Empty Array (NaN Bug)' },
      { id: 'tc-2', input: '10 20 30', expectedOutput: 'Average is: 20', label: 'Standard: Positive Integers' },
      { id: 'tc-3', input: '42', expectedOutput: 'Average is: 42', isEdgeCase: true, label: 'Edge Case: Single Element' },
      { id: 'tc-4', input: '-15 -25', expectedOutput: 'Average is: -20', label: 'Negative Numbers' },
      { id: 'tc-5', input: '0 0 0', expectedOutput: 'Average is: 0', isEdgeCase: true, label: 'Edge Case: All Zeroes' }
    ],
    samples: [
      {
        name: 'JS Sample: Array NaN Bug',
        description: 'Calculate average of numbers in array, failing on empty array.',
        code: `const fs = require('fs');

function calculateAverage(numbers) {
    let total = 0;
    for (let i = 0; i < numbers.length; i++) {
        total += numbers[i];
    }
    return total / numbers.length;
}

const input = fs.readFileSync(0, 'utf-8').trim();
const list = input ? input.split(/\\s+/).map(Number) : [];
console.log("Average is: " + calculateAverage(list));`
      },
      {
        name: 'JS Sample: Syntax Error',
        description: 'Missing closing bracket and unexpected token.',
        code: `function multiply(a, b {
    return a * b;
`
      },
      {
        name: 'JS Sample: Clean Fibonacci',
        description: 'Valid, working Fibonacci sequence calculation.',
        code: `function fibonacci(n) {
    const seq = [0, 1];
    for (let i = 2; i < n; i++) {
        seq.push(seq[i - 1] + seq[i - 2]);
    }
    return seq;
}

console.log("Fibonacci:", JSON.stringify(fibonacci(7)));`
      }
    ]
  },
  {
    id: 'cpp',
    name: 'C++ (G++ C++17)',
    shortName: 'C++',
    monacoLang: 'cpp',
    ext: '.cpp',
    badge: 'G++ C++17',
    defaultCode: `#include <iostream>
#include <vector>

double calculateAverage(const std::vector<double>& numbers) {
    double total = 0;
    for (size_t i = 0; i < numbers.size(); i++) {
        total += numbers[i];
    }
    // Bug: Division by zero when vector is empty
    return total / numbers.size();
}

int main() {
    std::vector<double> list;
    double val;
    while (std::cin >> val) {
        list.push_back(val);
    }
    std::cout << "Average is: " << calculateAverage(list) << std::endl;
    return 0;
}`,
    defaultDescription: 'Compute average of numbers in a vector, returning 0.0 for an empty vector.',
    defaultTestCases: [
      { id: 'tc-1', input: '', expectedOutput: 'Average is: 0', isEdgeCase: true, label: 'Edge Case: Empty Vector (Division by Zero)' },
      { id: 'tc-2', input: '10 20 30', expectedOutput: 'Average is: 20', label: 'Standard: Positive Integers' },
      { id: 'tc-3', input: '42', expectedOutput: 'Average is: 42', isEdgeCase: true, label: 'Edge Case: Single Element' },
      { id: 'tc-4', input: '-10 -20 -30', expectedOutput: 'Average is: -20', label: 'Negative Numbers' },
      { id: 'tc-5', input: '0 0 0', expectedOutput: 'Average is: 0', isEdgeCase: true, label: 'Edge Case: All Zeroes' }
    ],
    samples: [
      {
        name: 'C++ Sample: Vector Division by Zero',
        description: 'Division by zero on empty vector size.',
        code: `#include <iostream>
#include <vector>

double calculateAverage(const std::vector<double>& numbers) {
    double total = 0;
    for (size_t i = 0; i < numbers.size(); i++) {
        total += numbers[i];
    }
    return total / numbers.size();
}

int main() {
    std::vector<double> list;
    double val;
    while (std::cin >> val) {
        list.push_back(val);
    }
    std::cout << "Average is: " << calculateAverage(list) << std::endl;
    return 0;
}`
      },
      {
        name: 'C++ Sample: Compiler Syntax Error',
        description: 'Missing semicolon in std::cout statement.',
        code: `#include <iostream>

int main() {
    std::cout << "Missing semicolon error"
    return 0;
}`
      },
      {
        name: 'C++ Sample: Working Vector Accumulation',
        description: 'Valid, working summation program.',
        code: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = {10, 20, 30, 40};
    int sum = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}`
      }
    ]
  },
  {
    id: 'java',
    name: 'Java (JDK 17)',
    shortName: 'Java',
    monacoLang: 'java',
    ext: '.java',
    badge: 'JDK 17',
    defaultCode: `import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static double calculateAverage(List<Double> numbers) {
        double total = 0;
        for (int i = 0; i < numbers.size(); i++) {
            total += numbers.get(i);
        }
        // Bug: 0.0 / 0 returns NaN when list is empty
        return total / numbers.size();
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        List<Double> list = new ArrayList<>();
        while (scanner.hasNextDouble()) {
            list.add(scanner.nextDouble());
        }
        System.out.println("Average is: " + calculateAverage(list));
    }
}`,
    defaultDescription: 'Calculate average of a List of numbers, returning 0.0 when list is empty.',
    defaultTestCases: [
      { id: 'tc-1', input: '', expectedOutput: 'Average is: 0.0', isEdgeCase: true, label: 'Edge Case: Empty List (NaN Bug)' },
      { id: 'tc-2', input: '10 20 30', expectedOutput: 'Average is: 20.0', label: 'Standard: Positive Integers' },
      { id: 'tc-3', input: '42', expectedOutput: 'Average is: 42.0', isEdgeCase: true, label: 'Edge Case: Single Element' },
      { id: 'tc-4', input: '-10 -20 -30', expectedOutput: 'Average is: -20.0', label: 'Negative Numbers' },
      { id: 'tc-5', input: '0 0 0', expectedOutput: 'Average is: 0.0', isEdgeCase: true, label: 'Edge Case: All Zeroes' }
    ],
    samples: [
      {
        name: 'Java Sample: List NaN Bug',
        description: 'Average computation on empty List returns NaN.',
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static double calculateAverage(List<Double> numbers) {
        double total = 0;
        for (int i = 0; i < numbers.size(); i++) {
            total += numbers.get(i);
        }
        return total / numbers.size();
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        List<Double> list = new ArrayList<>();
        while (scanner.hasNextDouble()) {
            list.add(scanner.nextDouble());
        }
        System.out.println("Average is: " + calculateAverage(list));
    }
}`
      },
      {
        name: 'Java Sample: Compiler Syntax Error',
        description: 'Missing semicolon in System.out.println.',
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Missing semicolon")
    }
}`
      },
      {
        name: 'Java Sample: Clean Stream Filter',
        description: 'Valid, working Java stream computation.',
        code: `import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<String> names = List.of("Alice", "Bob", "Charlie", "David");
        long count = names.stream().filter(n -> n.length() > 4).count();
        System.out.println("Names longer than 4 chars: " + count);
    }
}`
      }
    ]
  }
];

export function getLanguageConfig(langId) {
  return SUPPORTED_LANGUAGES.find(l => l.id === langId) || SUPPORTED_LANGUAGES[0];
}
