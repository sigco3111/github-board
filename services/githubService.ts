
import type { GitHubUser, GitHubRepo, GitHubProject, GitHubCommit, GitHubContributor } from '../types';

const API_BASE_URL = 'https://api.github.com';

// Simple in-memory cache for API promises
const cache = new Map<string, Promise<any>>();

const cachedRequest = (url: string, options?: RequestInit): Promise<any> => {
  const cacheKey = JSON.stringify({ url, options });

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const promise = fetch(url, options).then(async (response) => {
    if (response.status === 204) { // No Content
      return [];
    }
    if (!response.ok) {
      // On failure, remove from cache to allow retries
      cache.delete(cacheKey);
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'An unknown error occurred');
    }
    return response.json();
  });

  cache.set(cacheKey, promise);
  return promise;
};


export const getUser = async (username: string): Promise<GitHubUser> => {
  return cachedRequest(`${API_BASE_URL}/users/${username}`);
};

export const getRepos = async (username: string): Promise<GitHubRepo[]> => {
  return cachedRequest(`${API_BASE_URL}/users/${username}/repos?per_page=100&sort=pushed`);
};

export const getProjects = async (username:string): Promise<GitHubProject[]> => {
    return cachedRequest(`${API_BASE_URL}/users/${username}/projects`, {
        headers: {
            'Accept': 'application/vnd.github.inertia-preview+json',
        },
    });
};

export const getCommits = async (fullName: string): Promise<GitHubCommit[]> => {
  return cachedRequest(`${API_BASE_URL}/repos/${fullName}/commits?per_page=5`);
};

export const getContributors = async (fullName: string): Promise<GitHubContributor[]> => {
  return cachedRequest(`${API_BASE_URL}/repos/${fullName}/contributors`);
};
