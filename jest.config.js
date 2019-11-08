module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
	'^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '.*\\.spec.(ts|tsx|js)$',
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
	global: {
	  branches: 80,
	  functions: 80,
	  lines: 80,
	  statements: -250
	}
  },
  collectCoverageFrom: [
	'src/modules/**/*.{ts,tsx}'
  ],
  clearMocks: true,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleDirectories: ['node_modules', 'src']
};
