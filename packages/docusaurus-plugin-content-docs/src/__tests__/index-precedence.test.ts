/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import {readVersionDocs} from '../docs';
import type {VersionMetadata} from '@docusaurus/plugin-content-docs';
import type {DocFile} from '../types';

// Mock fs-extra and other dependencies
jest.mock('fs-extra');
jest.mock('@docusaurus/utils', () => ({
  ...jest.requireActual('@docusaurus/utils'),
  Globby: jest.fn(),
  getFolderContainingFile: jest.fn(),
}));

import fs from 'fs-extra';
import {Globby, getFolderContainingFile} from '@docusaurus/utils';

const mockGlobby = Globby as jest.MockedFunction<typeof Globby>;
const mockGetFolderContainingFile = getFolderContainingFile as jest.MockedFunction<typeof getFolderContainingFile>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe('index file precedence', () => {
  const mockVersionMetadata: VersionMetadata = {
    contentPath: '/docs',
    contentPathLocalized: undefined,
    versionName: 'current',
    versionLabel: 'Next',
    versionPath: '/docs',
    path: '/docs',
    tagsPath: '/docs/tags',
    editUrl: undefined,
    editUrlLocalized: undefined,
    isLast: true,
    routePriority: undefined,
    sidebarFilePath: undefined,
    banner: undefined,
    badge: false,
    className: undefined,
  };

  const mockOptions = {
    include: ['**/*.{md,mdx}'],
    exclude: [],
    showLastUpdateAuthor: false,
    showLastUpdateTime: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFolderContainingFile.mockResolvedValue('/docs');
    mockReadFile.mockResolvedValue('# Test content');
  });

  it('should prioritize index.md over same-named directory file', async () => {
    const sources = [
      'demo/index.md',
      'demo/demo.mdx',
      'demo/other.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(2);
    expect(result.map(f => f.source)).toEqual([
      'demo/index.md',
      'demo/other.md',
    ]);
    expect(result.map(f => f.source)).not.toContain('demo/demo.mdx');
  });

  it('should prioritize index.mdx over same-named directory file', async () => {
    const sources = [
      'module/index.mdx',
      'module/module.md',
      'module/other.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(2);
    expect(result.map(f => f.source)).toEqual([
      'module/index.mdx',
      'module/other.md',
    ]);
    expect(result.map(f => f.source)).not.toContain('module/module.md');
  });

  it('should handle multiple directories with conflicts', async () => {
    const sources = [
      'demo/index.md',
      'demo/demo.mdx',
      'guide/index.md',
      'guide/guide.md',
      'api/other.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(3);
    expect(result.map(f => f.source)).toEqual([
      'demo/index.md',
      'guide/index.md',
      'api/other.md',
    ]);
    expect(result.map(f => f.source)).not.toContain('demo/demo.mdx');
    expect(result.map(f => f.source)).not.toContain('guide/guide.md');
  });

  it('should include same-named files when no index file exists', async () => {
    const sources = [
      'demo/demo.mdx',
      'guide/guide.md',
      'api/other.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(3);
    expect(result.map(f => f.source)).toEqual([
      'demo/demo.mdx',
      'guide/guide.md',
      'api/other.md',
    ]);
  });

  it('should handle case-insensitive matching', async () => {
    const sources = [
      'Demo/INDEX.md',
      'Demo/demo.mdx',
      'Guide/Index.mdx',
      'Guide/GUIDE.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(2);
    expect(result.map(f => f.source)).toEqual([
      'Demo/INDEX.md',
      'Guide/Index.mdx',
    ]);
    expect(result.map(f => f.source)).not.toContain('Demo/demo.mdx');
    expect(result.map(f => f.source)).not.toContain('Guide/GUIDE.md');
  });

  it('should handle nested directories correctly', async () => {
    const sources = [
      'api/v1/index.md',
      'api/v1/v1.mdx',
      'api/v2/v2.md',
      'guides/getting-started/index.mdx',
      'guides/getting-started/getting-started.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(3);
    expect(result.map(f => f.source)).toEqual([
      'api/v1/index.md',
      'api/v2/v2.md',
      'guides/getting-started/index.mdx',
    ]);
    expect(result.map(f => f.source)).not.toContain('api/v1/v1.mdx');
    expect(result.map(f => f.source)).not.toContain('guides/getting-started/getting-started.md');
  });

  it('should not affect files in root directory', async () => {
    const sources = [
      'index.md',
      'demo.mdx',
      'guide.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(3);
    expect(result.map(f => f.source)).toEqual([
      'index.md',
      'demo.mdx',
      'guide.md',
    ]);
  });

  it('should handle multiple index files in same directory', async () => {
    const sources = [
      'demo/index.md',
      'demo/index.mdx',
      'demo/demo.md',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    const result = await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(result).toHaveLength(2);
    expect(result.map(f => f.source)).toContain('demo/index.md');
    expect(result.map(f => f.source)).toContain('demo/index.mdx');
    expect(result.map(f => f.source)).not.toContain('demo/demo.md');
  });

  it('should log conflicts when they occur', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const sources = [
      'demo/index.md',
      'demo/demo.mdx',
    ];
    
    mockGlobby.mockResolvedValue(sources);
    
    await readVersionDocs(mockVersionMetadata, mockOptions);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Docusaurus found conflicting files where index files take precedence')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('demo/demo.mdx (ignored due to index file in same directory)')
    );
    
    consoleSpy.mockRestore();
  });
});
