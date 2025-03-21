/**
 * Unit tests for Permission value object
 */
import { describe, expect, it } from '@jest/globals';
import { Permission, PermissionCategory, PermissionAction } from '../../../../../core/domain/admin/permission';

describe('Permission Value Object', () => {
  it('should create valid permission objects', () => {
    // Arrange & Act
    const viewContent = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW);
    const editMedia = new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.EDIT);
    const deleteUsers = new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.DELETE);
    
    // Assert
    expect(viewContent).toBeInstanceOf(Permission);
    expect(editMedia).toBeInstanceOf(Permission);
    expect(deleteUsers).toBeInstanceOf(Permission);
    
    expect(viewContent.category).toBe(PermissionCategory.CONTENT_MANAGEMENT);
    expect(viewContent.action).toBe(PermissionAction.VIEW);
    expect(editMedia.category).toBe(PermissionCategory.MEDIA_MANAGEMENT);
    expect(editMedia.action).toBe(PermissionAction.EDIT);
    expect(deleteUsers.category).toBe(PermissionCategory.USER_MANAGEMENT);
    expect(deleteUsers.action).toBe(PermissionAction.DELETE);
  });
  
  it('should correctly handle equality comparisons', () => {
    // Arrange
    const viewContent1 = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW);
    const viewContent2 = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW);
    const editContent = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.EDIT);
    const viewMedia = new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.VIEW);
    
    // Act & Assert
    expect(viewContent1.equals(viewContent2)).toBe(true);
    expect(viewContent1.equals(editContent)).toBe(false);
    expect(viewContent1.equals(viewMedia)).toBe(false);
    expect(editContent.equals(viewMedia)).toBe(false);
  });
  
  it('should correctly check if another permission includes this one', () => {
    // Arrange
    const viewContent = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW);
    const editContent = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.EDIT);
    const deleteContent = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.DELETE);
    const viewMedia = new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.VIEW);
    
    // Act & Assert
    // DELETE permission includes EDIT and VIEW permissions for the same category
    expect(deleteContent.includes(viewContent)).toBe(true);
    expect(deleteContent.includes(editContent)).toBe(true);
    expect(deleteContent.includes(deleteContent)).toBe(true);
    
    // EDIT permission includes VIEW permission for the same category
    expect(editContent.includes(viewContent)).toBe(true);
    expect(editContent.includes(editContent)).toBe(true);
    expect(editContent.includes(deleteContent)).toBe(false);
    
    // VIEW permission only includes itself
    expect(viewContent.includes(viewContent)).toBe(true);
    expect(viewContent.includes(editContent)).toBe(false);
    expect(viewContent.includes(deleteContent)).toBe(false);
    
    // Different categories never include each other
    expect(viewContent.includes(viewMedia)).toBe(false);
    expect(viewMedia.includes(viewContent)).toBe(false);
  });
  
  it('should create permissions from string values', () => {
    // Arrange & Act
    const permission = Permission.fromString('content_management:edit');
    
    // Assert
    expect(permission).toBeInstanceOf(Permission);
    expect(permission.category).toBe(PermissionCategory.CONTENT_MANAGEMENT);
    expect(permission.action).toBe(PermissionAction.EDIT);
  });
  
  it('should throw error for invalid permission strings', () => {
    // Arrange & Act & Assert
    expect(() => {
      Permission.fromString('invalid_category:view');
    }).toThrow('Invalid permission category: invalid_category');
    
    expect(() => {
      Permission.fromString('content_management:invalid_action');
    }).toThrow('Invalid permission action: invalid_action');
    
    expect(() => {
      Permission.fromString('invalid_format');
    }).toThrow('Invalid permission string format: invalid_format');
  });
  
  it('should convert permission to string representation', () => {
    // Arrange
    const viewContent = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW);
    const editMedia = new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.EDIT);
    const deleteUsers = new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.DELETE);
    
    // Act & Assert
    expect(viewContent.toString()).toBe('content_management:view');
    expect(editMedia.toString()).toBe('media_management:edit');
    expect(deleteUsers.toString()).toBe('user_management:delete');
  });
  
  it('should correctly serialize to and deserialize from data', () => {
    // Arrange
    const original = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.EDIT);
    
    // Act
    const data = original.toData();
    const recreated = Permission.fromData(data);
    
    // Assert
    expect(recreated.category).toBe(original.category);
    expect(recreated.action).toBe(original.action);
    expect(recreated.toString()).toBe(original.toString());
    expect(recreated.equals(original)).toBe(true);
  });
});