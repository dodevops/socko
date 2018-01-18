export default [
  {
    name: 'generate',
    args: [
      'generate',
      '--input',
      'assets/input',
      '--output',
      'assets/output',
      '--hierarchy',
      'assets/hierarchy',
      '--node',
      'nodeA',
      '--clean-output',
      '--ignore',
      ':_root:nodeA=hashCollectorRegExpCartridge2.txt'
    ]
  }
]
