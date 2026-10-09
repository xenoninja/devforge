# Developer Dashboard

The developer dashboard is a solo developer's workspace for managing ideas, projects, and planned features.

## Language

**Idea**:
A recorded possibility for a project that the developer may pursue or abandon.
_Avoid_: Feature, project

**Project**:
A development effort that the developer is experimenting with, developing, or has abandoned. It may originate from an idea or be recorded directly, and exists independently of a repository.
_Avoid_: Idea, repository

**Feature**:
A proposed or realized capability belonging to exactly one project, tracked from initial consideration through development, completion, or abandonment.
_Avoid_: Idea, GitHub issue

**New**:
An idea still under consideration or a feature whose development has not started, including one restored from abandonment.
_Avoid_: Experimenting

**Experimenting**:
A project stage devoted to verifying a minimum viable product (MVP).
_Avoid_: Developing

**Developing (project)**:
An ongoing project the developer intends to maintain, including periods without active coding.
_Avoid_: Actively coding, completed

**Promotion**:
The conversion of an idea into one project, retaining the original idea and its link to that project. The project starts with a copy of the idea's title and description; the two records subsequently remain independent.
_Avoid_: Moving, deleting the idea

**Abandoned**:
An idea, project, or feature the developer has chosen to stop pursuing, whose record is retained and can be revived.
_Avoid_: Deleted

**Developing (feature)**:
A feature whose implementation has started, whether its project is experimenting or developing.
_Avoid_: Developing (project), issue opened

**Completed**:
A feature whose implementation the developer considers finished; it may be reopened for development.
_Avoid_: Completed project

**Repository link**:
An optional reference from a project to its GitHub repository, maintained manually by the developer.
_Avoid_: Project

**Issue link**:
An optional reference from a feature to a GitHub issue, maintained manually by the developer.
_Avoid_: Feature
