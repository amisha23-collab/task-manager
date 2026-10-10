
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';

import { createTaskService } from '../src/services/taskService.js';
import {
  makeCache,
  makeSearch,
  makeTaskModel,
  silentLogger,
} from './helpers.js';

const USER_A = String(new mongoose.Types.ObjectId());
const USER_B = String(new mongoose.Types.ObjectId());

describe('taskService', () => {
  let TaskModel;
  let cache;
  let search;
  let service;

  beforeEach(() => {
    TaskModel = makeTaskModel();
    cache = makeCache();
    search = makeSearch();

    service = createTaskService({
      TaskModel,
      cache,
      search,
      logger: silentLogger,
    });
  });

  describe('createTask', () => {
    it('creates, indexes and invalidates cache', async () => {
      const task = await service.createTask(USER_A, {
        title: '  Write report ',
        description: 'Q3 numbers',
      });

      assert.equal(task.title, 'Write report');
      assert.equal(task.userId, USER_A);
      assert.equal(task.completed, false);
      assert.ok(search.docs.has(task.id));
      assert.equal(cache.calls.invalidate, 1);
    });

    it('rejects an empty title', async () => {
      await assert.rejects(
        service.createTask(USER_A, { title: '   ' }),
        /Title cannot be empty/
      );

      assert.equal(TaskModel.store.length, 0);
    });

    it('succeeds when Redis and Elasticsearch are down', async () => {
      service = createTaskService({
        TaskModel,
        cache: makeCache({ failing: true }),
        search: makeSearch({ failing: true }),
        logger: silentLogger,
      });

      const task = await service.createTask(USER_A, {
        title: 'Resilient',
      });

      assert.equal(task.title, 'Resilient');
    });
  });

  describe('getTasks (pagination and Redis cache)', () => {
    it('caches a page and returns the cached result on the next call', async () => {
      await service.createTask(USER_A, { title: 'One' });

      const first = await service.getTasks(USER_A);

      assert.equal(first.tasks.length, 1);
      assert.equal(first.tasks[0].title, 'One');
      assert.equal(first.pagination.page, 1);
      assert.equal(first.pagination.limit, 10);
      assert.equal(first.pagination.total, 1);
      assert.equal(first.pagination.totalPages, 1);
      assert.equal(first.pagination.hasNextPage, false);
      assert.equal(first.pagination.hasPreviousPage, false);
      assert.equal(cache.calls.set, 1);
      assert.ok(cache.data.has(cache.keyFor(USER_A, 1, 10)));

      // Prove the second response comes from Redis.
      TaskModel.store.length = 0;

      const second = await service.getTasks(USER_A);

      assert.equal(second.tasks.length, 1);
      assert.equal(second.tasks[0].title, 'One');
      assert.equal(cache.calls.set, 1);
    });

    it('serves an empty cached page', async () => {
      const first = await service.getTasks(USER_A);

      assert.deepEqual(first.tasks, []);
      assert.equal(first.pagination.total, 0);

      await TaskModel.create({
        title: 'Added behind the cache',
        userId: USER_A,
      });

      const second = await service.getTasks(USER_A);

      assert.deepEqual(second.tasks, []);
      assert.equal(second.pagination.total, 0);
    });

    it('invalidates cached pages after create, update and delete', async () => {
      const created = await service.createTask(USER_A, {
        title: 'Fresh',
      });

      let result = await service.getTasks(USER_A);
      assert.equal(result.tasks.length, 1);
      assert.ok(cache.data.has(cache.keyFor(USER_A, 1, 10)));

      await service.updateTask(USER_A, created.id, {
        title: 'Renamed',
      });

      assert.equal(cache.data.size, 0);

      result = await service.getTasks(USER_A);
      assert.equal(result.tasks[0].title, 'Renamed');

      await service.deleteTask(USER_A, created.id);
      assert.equal(cache.data.size, 0);

      result = await service.getTasks(USER_A);
      assert.equal(result.tasks.length, 0);
      assert.equal(result.pagination.total, 0);
    });

    it('falls back to MongoDB when Redis is down', async () => {
      service = createTaskService({
        TaskModel,
        cache: makeCache({ failing: true }),
        search,
        logger: silentLogger,
      });

      await service.createTask(USER_A, { title: 'From Mongo' });

      const result = await service.getTasks(USER_A);

      assert.equal(result.tasks.length, 1);
      assert.equal(result.tasks[0].title, 'From Mongo');
    });

    it('only returns the requesting user tasks', async () => {
      await service.createTask(USER_A, { title: 'A task' });
      await service.createTask(USER_B, { title: 'B task' });

      const result = await service.getTasks(USER_A);

      assert.deepEqual(
        result.tasks.map((task) => task.title),
        ['A task']
      );

      assert.equal(result.pagination.total, 1);
    });

    it('returns the correct page and pagination metadata', async () => {
      await service.createTask(USER_A, { title: 'Task 1' });
      await service.createTask(USER_A, { title: 'Task 2' });
      await service.createTask(USER_A, { title: 'Task 3' });

      const result = await service.getTasks(USER_A, {
        page: 2,
        limit: 2,
      });

      assert.equal(result.tasks.length, 1);
      assert.equal(result.tasks[0].title, 'Task 1');
      assert.equal(result.pagination.page, 2);
      assert.equal(result.pagination.limit, 2);
      assert.equal(result.pagination.total, 3);
      assert.equal(result.pagination.totalPages, 2);
      assert.equal(result.pagination.hasNextPage, false);
      assert.equal(result.pagination.hasPreviousPage, true);
    });

    it('limits page size to 50', async () => {
      const result = await service.getTasks(USER_A, {
        page: 1,
        limit: 1000,
      });

      assert.equal(result.pagination.limit, 50);
    });

    it('uses default pagination for zero values', async () => {
      const result = await service.getTasks(USER_A, {
        page: 0,
        limit: 0,
      });

      assert.equal(result.pagination.page, 1);
      assert.equal(result.pagination.limit, 10);
    });

    it('clamps a page beyond the last page', async () => {
      await service.createTask(USER_A, { title: 'Only task' });

      const result = await service.getTasks(USER_A, {
        page: 999,
        limit: 10,
      });

      assert.equal(result.pagination.page, 1);
      assert.equal(result.tasks.length, 1);
    });
  });

  describe('updateTask', () => {
    it('updates fields and re-indexes the task', async () => {
      const { id } = await service.createTask(USER_A, {
        title: 'Old',
      });

      const updated = await service.updateTask(USER_A, id, {
        title: 'New',
        description: 'Details',
        completed: true,
      });

      assert.equal(updated.title, 'New');
      assert.equal(updated.description, 'Details');
      assert.equal(updated.completed, true);
      assert.equal(search.docs.get(id).title, 'New');
    });

    it('cannot update another user task', async () => {
      const { id } = await service.createTask(USER_A, {
        title: 'Private',
      });

      await assert.rejects(
        service.updateTask(USER_B, id, { title: 'Hacked' }),
        /Task not found/
      );

      assert.equal(TaskModel.store[0].title, 'Private');
    });

    it('rejects invalid IDs and empty updates', async () => {
      await assert.rejects(
        service.updateTask(USER_A, 'not-an-id', { title: 'x' }),
        /Invalid task id/
      );

      const { id } = await service.createTask(USER_A, {
        title: 'Keep',
      });

      await assert.rejects(
        service.updateTask(USER_A, id, {}),
        /at least one field/
      );
    });
  });

  describe('deleteTask', () => {
    it('removes the task from MongoDB and Elasticsearch', async () => {
      const { id } = await service.createTask(USER_A, {
        title: 'Temporary',
      });

      await service.deleteTask(USER_A, id);

      assert.equal(TaskModel.store.length, 0);
      assert.equal(search.docs.has(id), false);
    });

    it('cannot delete another user task', async () => {
      const { id } = await service.createTask(USER_A, {
        title: 'Mine',
      });

      await assert.rejects(
        service.deleteTask(USER_B, id),
        /Task not found/
      );

      assert.equal(TaskModel.store.length, 1);
      assert.equal(search.docs.has(id), true);
    });
  });

  describe('searchTasks (Elasticsearch)', () => {
    it('searches titles and descriptions for the current user', async () => {
      await service.createTask(USER_A, {
        title: 'Buy groceries',
        description: 'milk and eggs',
      });

      await service.createTask(USER_A, {
        title: 'Call dentist',
        description: 'book groceries budget review',
      });

      await service.createTask(USER_B, {
        title: 'Groceries for B',
      });

      const byTitle = await service.searchTasks(USER_A, 'buy');
      assert.deepEqual(byTitle.map((task) => task.title), [
        'Buy groceries',
      ]);

      const byDescription = await service.searchTasks(USER_A, 'eggs');
      assert.deepEqual(byDescription.map((task) => task.title), [
        'Buy groceries',
      ]);

      const both = await service.searchTasks(USER_A, 'groceries');
      assert.equal(both.length, 2);
    });

    it('returns an empty list for a blank query', async () => {
      assert.deepEqual(await service.searchTasks(USER_A, '   '), []);
      assert.equal(search.calls.search, 0);
    });

    it('returns a friendly error when Elasticsearch is down', async () => {
      service = createTaskService({
        TaskModel,
        cache,
        search: makeSearch({ failing: true }),
        logger: silentLogger,
      });

      await assert.rejects(
        service.searchTasks(USER_A, 'anything'),
        /Search is temporarily unavailable/
      );
    });
  });
});
