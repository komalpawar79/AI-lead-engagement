import { Router } from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addConfiguration,
  updateConfiguration,
  deleteConfiguration,
  addKnowledgeItem,
  deleteKnowledgeItem,
} from '../controllers/project.controller';

const router = Router();

router.get('/', getAllProjects);
router.post('/', createProject);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Configuration inventory management
router.post('/:id/configurations', addConfiguration);
router.put('/:id/configurations/:configId', updateConfiguration);
router.delete('/:id/configurations/:configId', deleteConfiguration);

// Project knowledge / FAQs
router.post('/:id/knowledge', addKnowledgeItem);
router.delete('/:id/knowledge/:knowledgeId', deleteKnowledgeItem);

export default router;


