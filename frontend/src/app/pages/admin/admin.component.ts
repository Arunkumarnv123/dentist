import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-admin',
    template: `
    <div class="main-content fade-in">
      <div class="container">
        <div class="page-header">
          <div>
            <h1 class="page-title">Admin Panel</h1>
            <p class="page-subtitle">Manage users and system settings</p>
          </div>
          <button class="btn btn-primary" (click)="showCreateUser = !showCreateUser">
            {{ showCreateUser ? '✕ Cancel' : '➕ New User' }}
          </button>
        </div>

        <!-- Create User Form -->
        <div class="card form-card" *ngIf="showCreateUser">
          <h3 style="margin-bottom: 1.25rem;">{{ editingUser ? '✏️ Edit User' : '👤 Create New User' }}</h3>

          <form (ngSubmit)="saveUser()">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input type="text" class="form-control" [(ngModel)]="userForm.name" name="name"
                       placeholder="Enter full name" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email *</label>
                <input type="email" class="form-control" [(ngModel)]="userForm.email" name="email"
                       placeholder="user@dental.com" required [disabled]="!!editingUser">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" *ngIf="!editingUser">
                <label class="form-label">Password *</label>
                <input type="password" class="form-control" [(ngModel)]="userForm.password" name="password"
                       placeholder="Min 6 characters" required>
              </div>
              <div class="form-group">
                <label class="form-label">Role *</label>
                <select class="form-control" [(ngModel)]="userForm.role" name="role" required>
                  <option value="">Select Role</option>
                  <option value="dentist">Dentist</option>
                  <option value="camp_admin">Camp Admin</option>
                  <option value="system_admin">System Admin</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" class="form-control" [(ngModel)]="userForm.phone" name="phone"
                       placeholder="10-digit number" maxlength="10">
              </div>
              <div class="form-group" *ngIf="editingUser">
                <label class="form-label">Status</label>
                <div class="toggle-group">
                  <button type="button" class="toggle-btn" [class.active]="userForm.is_active === true"
                          (click)="userForm.is_active = true">✅ Active</button>
                  <button type="button" class="toggle-btn" [class.active]="userForm.is_active === false"
                          (click)="userForm.is_active = false">🚫 Inactive</button>
                </div>
              </div>
            </div>

            <div *ngIf="formError" class="error-msg">{{ formError }}</div>

            <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                {{ saving ? 'Saving...' : (editingUser ? 'Update User' : 'Create User') }}
              </button>
              <button type="button" class="btn btn-outline" (click)="cancelEdit()">Cancel</button>
            </div>
          </form>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-overlay">
          <div class="spinner"></div>
          <span>Loading users...</span>
        </div>

        <!-- Users Table -->
        <div class="table-container" *ngIf="!loading && users.length > 0">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users">
                <td style="font-weight: 600;">{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-danger': user.role === 'system_admin',
                    'badge-primary': user.role === 'dentist',
                    'badge-info': user.role === 'camp_admin',
                    'badge-warning': user.role === 'auditor'
                  }">{{ formatRole(user.role) }}</span>
                </td>
                <td>{{ user.phone || '—' }}</td>
                <td>
                  <span class="badge" [ngClass]="user.is_active !== false ? 'badge-success' : 'badge-danger'">
                    {{ user.is_active !== false ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td>
                  <button class="btn btn-outline btn-sm" (click)="editUser(user)">✏️ Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty -->
        <div *ngIf="!loading && users.length === 0" class="card" style="text-align: center; padding: 3rem;">
          <h2>No Users Found</h2>
          <p style="color: var(--text-secondary); margin: 1rem 0;">Create your first user to get started.</p>
        </div>

        <!-- Toast -->
        <div class="toast toast-success" *ngIf="toast">{{ toast }}</div>
      </div>
    </div>
  `,
    styles: [`
    .form-card { margin-bottom: 1.5rem; }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .error-msg {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 0.75rem;
      color: #f87171;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      text-align: center;
    }

    @media (max-width: 768px) {
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminComponent implements OnInit {
    users: any[] = [];
    loading = false;
    saving = false;
    showCreateUser = false;
    editingUser: any = null;
    formError = '';
    toast = '';

    userForm: any = {
        name: '', email: '', password: '', role: '',
        phone: '', is_active: true,
    };

    constructor(
        public auth: AuthService,
        private api: ApiService,
        private router: Router
    ) { }

    ngOnInit(): void {
        if (!this.auth.isLoggedIn || !this.auth.hasRole('system_admin')) {
            this.router.navigate(['/dashboard']);
            return;
        }
        this.loadUsers();
    }

    loadUsers(): void {
        this.loading = true;
        this.api.getUsers().subscribe({
            next: (res) => {
                this.users = res.users;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load users', err);
                this.loading = false;
            }
        });
    }

    saveUser(): void {
        if (!this.userForm.name || !this.userForm.role) {
            this.formError = 'Please fill in all required fields.';
            return;
        }
        if (!this.editingUser && (!this.userForm.email || !this.userForm.password)) {
            this.formError = 'Email and password are required for new users.';
            return;
        }

        this.formError = '';
        this.saving = true;

        // Phone validation
        if (this.userForm.phone && !/^[0-9]{10}$/.test(this.userForm.phone)) {
            this.formError = 'Please enter a valid 10-digit phone number (digits only).';
            this.saving = false;
            return;
        }

        if (this.editingUser) {
            const updateData: any = {
                name: this.userForm.name,
                role: this.userForm.role,
                phone: this.userForm.phone || null,
                is_active: this.userForm.is_active,
            };

            this.api.updateUser(this.editingUser.id, updateData).subscribe({
                next: () => {
                    this.saving = false;
                    this.showCreateUser = false;
                    this.editingUser = null;
                    this.resetForm();
                    this.loadUsers();
                    this.showToast('User updated successfully!');
                },
                error: (err) => {
                    this.saving = false;
                    this.formError = err.error?.error || 'Failed to update user.';
                }
            });
        } else {
            this.api.createUser(this.userForm).subscribe({
                next: () => {
                    this.saving = false;
                    this.showCreateUser = false;
                    this.resetForm();
                    this.loadUsers();
                    this.showToast('User created successfully!');
                },
                error: (err) => {
                    this.saving = false;
                    this.formError = err.error?.error || err.error?.errors?.[0]?.msg || 'Failed to create user.';
                }
            });
        }
    }

    editUser(user: any): void {
        this.editingUser = user;
        this.userForm = {
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            phone: user.phone || '',
            is_active: user.is_active !== false,
        };
        this.showCreateUser = true;
    }

    cancelEdit(): void {
        this.showCreateUser = false;
        this.editingUser = null;
        this.resetForm();
    }

    resetForm(): void {
        this.userForm = {
            name: '', email: '', password: '', role: '',
            phone: '', is_active: true,
        };
        this.formError = '';
    }

    formatRole(role: string): string {
        return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    showToast(msg: string): void {
        this.toast = msg;
        setTimeout(() => { this.toast = ''; }, 3000);
    }
}
