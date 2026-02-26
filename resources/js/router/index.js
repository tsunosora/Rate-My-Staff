import { createRouter, createWebHistory } from 'vue-router';

// Component definitions
import Login from '../Pages/Auth/Login.vue';
import Dashboard from '../Pages/Dashboard/Index.vue';
import CreateSingleAssessment from '../Pages/Assessment/CreateSingle.vue';
import EmployeeIndex from '../Pages/Employee/Index.vue';

const routes = [
    {
        path: '/login',
        name: 'login',
        component: Login,
        meta: { title: 'Login - Employee Assessment Admin' }
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: { title: 'Dashboard Overview' }
    },
    {
        path: '/employees',
        name: 'employees',
        component: EmployeeIndex,
        meta: { title: 'Employee Directory' }
    },
    {
        path: '/reports',
        name: 'reports',
        component: () => import('../Pages/Report/Index.vue'),
        meta: { title: 'Reports & Analytics' }
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('../Pages/Setting/Index.vue'),
        meta: { title: 'Settings & User Management' }
    },
    {
        path: '/assessments/create/single',
        name: 'assessments.create.single',
        component: CreateSingleAssessment,
        meta: { title: 'New Assessment' }
    },
    {
        path: '/assessments/edit/:id',
        name: 'assessments.edit.single',
        component: () => import('../Pages/Assessment/EditSingle.vue'),
        meta: { title: 'Edit Assessment' }
    },
    {
        path: '/assessments/create/bulk',
        name: 'assessments.create.bulk',
        component: () => import('../Pages/Assessment/CreateBulk.vue'),
        meta: { title: 'Bulk Assessment' }
    },
    {
        path: '/assessments/templates',
        name: 'assessments.templates',
        component: () => import('../Pages/Assessment/Templates.vue'),
        meta: { title: 'Assessment Templates' }
    },
    // Catch-all route to redirect unknown paths
    {
        path: '/:pathMatch(.*)*',
        redirect: '/dashboard'
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

import axios from 'axios';

router.beforeEach(async (to, from, next) => {
    document.title = to.meta.title || 'Employee Assessment Admin';

    // Check authentication state
    try {
        const authResponse = await axios.get('/api/test-auth');
        const isAuthenticated = authResponse.data.auth_check;

        if (to.name === 'login' && isAuthenticated) {
            return next({ name: 'dashboard' });
        }

        if (to.name !== 'login' && !isAuthenticated) {
            return next({ name: 'login' });
        }

        next();
    } catch (error) {
        // If API fails (e.g. 401 Unauthorized), redirect to login if not already there
        if (to.name !== 'login') {
            return next({ name: 'login' });
        }
        next();
    }
});

export default router;
